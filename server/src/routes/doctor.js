// AI doctor routes (owner: Hana Haytham).
//   POST /api/doctor/chat  body: { message, history?: [{ role: 'user' | 'doctor', text }] }
//                          answer: { reply, redFlag, redFlagReason, source: 'ai' | 'demo', sources: [{ n, title, url }] }
// Order: red-flag check first (no AI needed) -> find matching NASA passages (retrieve.js)
//        -> Gemini with a 15 s timeout -> saved demo answer if that fails.
// `sources` lists only the NASA pages the answer actually cites ([1], [2]...); empty for demo answers.
// Every answer is also saved to MongoDB (models/DoctorMessage.js) when the database is connected.
//   GET /api/doctor/history/:crewId?limit=20  answer: { messages: [...oldest first], database: true | false }
//   Each saved answer has an `id`, and `sentToEarth: { sentAt, arrivesAt }` once she sent it to the flight surgeon,
//   so the chat page can rebuild the chat and the "sent" animations after a reload.
import { Router } from 'express';
import mongoose from 'mongoose';
import DoctorMessage from '../models/DoctorMessage.js';
import SurgeonNote from '../models/SurgeonNote.js';
import { GoogleGenAI } from '@google/genai';
import { buildSystemPrompt, getCrewMedicalOfficer } from '../doctor/buildContext.js';
import { checkRedFlags } from '../doctor/redFlags.js';
import { demoAnswer, emergencyLine } from '../doctor/demoAnswers.js';
import { retrieve, toPromptSources, toSourceList } from '../doctor/retrieve.js';
import { trimOffTopicWarnings } from '../doctor/checkReply.js';

const router = Router();

const TIMEOUT_MS = 15000;
const HISTORY_LIMIT = 6; // last 6 messages, so follow-up questions make sense
const MAX_MESSAGE_LENGTH = 1000;

// One Gemini client for the whole server. The key stays here, never in the React app.
let ai = null;
function getAi() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!ai) ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return ai;
}

router.get('/', (req, res) => res.json({ ok: true, feature: 'doctor', ai: Boolean(process.env.GEMINI_API_KEY) }));

// Keeps only well-formed recent turns, in the shape Gemini expects.
function toGeminiHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((h) => h && typeof h.text === 'string' && h.text.trim() && (h.role === 'user' || h.role === 'doctor'))
    .slice(-HISTORY_LIMIT)
    .map((h) => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text.slice(0, MAX_MESSAGE_LENGTH * 2) }] }));
}

async function askGemini({ systemPrompt, history, message }) {
  const client = getAi();
  if (!client) throw new Error('GEMINI_API_KEY is not set');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const result = await client.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3, // calm, consistent answers (prompt.md, section 3)
        // Room for the model's own thinking plus a ~150-word answer.
        maxOutputTokens: 1024,
        abortSignal: controller.signal,
      },
    });
    const text = (result.text || '').trim();
    if (!text) throw new Error('Empty answer from the AI');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

// Keeps the NASA pages whose numbers appear in the answer, so the chat never shows a source Gemini didn't use.
function citedSources(reply, chunks) {
  // Accepts [1], [1][2] and [1, 2]
  const cited = new Set([...reply.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)].flatMap((m) => m[1].split(',').map((x) => Number(x.trim()))));
  return toSourceList(chunks)
    .filter((s) => s.n.some((n) => cited.has(n)))
    .map((s) => ({ n: s.n.filter((n) => cited.has(n)), title: s.title, url: s.url }));
}

// True when MongoDB is connected. Without it the doctor still answers; it just doesn't save.
const dbReady = () => mongoose.connection.readyState === 1;

// Saves one question and answer. Never throws and never delays the reply.
function saveMessage(doc) {
  if (!dbReady()) return;
  DoctorMessage.create(doc).catch((err) => console.warn('[doctor] could not save the chat:', err.message));
}

// Her saved chat, oldest first, so the chat page or the flight surgeon can show it in order.
router.get('/history/:crewId', async (req, res) => {
  if (!dbReady()) return res.json({ messages: [], database: false });
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  try {
    const docs = await DoctorMessage.find({ crewId: req.params.crewId }).sort({ createdAt: -1 }).limit(limit).lean();
    // Which of these answers she already sent to Earth, and when.
    const ids = docs.map((d) => String(d._id));
    const notes = await SurgeonNote.find({ crewId: req.params.crewId, messageId: { $in: ids } }).lean();
    const sent = new Map(notes.map((n) => [n.messageId, { sentAt: n.sentAt, arrivesAt: n.arrivesAt }]));
    const messages = docs.reverse().map(({ _id, question, reply, source, redFlag, redFlagReason, sources, createdAt }) => ({
      id: String(_id),
      question,
      reply,
      source,
      redFlag,
      redFlagReason,
      sources,
      createdAt,
      sentToEarth: sent.get(String(_id)) || null,
    }));
    res.json({ messages, database: true });
  } catch (err) {
    console.warn('[doctor] could not read the chat history:', err.message);
    res.status(500).json({ error: 'Could not load the chat history.' });
  }
});

router.post('/chat', async (req, res) => {
  const { message, history, crewId = 'sara' } = req.body || {};
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Please type a question for the AI doctor.' });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `Please keep your message under ${MAX_MESSAGE_LENGTH} characters.` });
  }

  const clean = message.trim();
  const flag = checkRedFlags(clean);
  const officer = getCrewMedicalOfficer(crewId);

  // NASA passages that match her question. Never throws: worst case it returns none.
  const { chunks, method } = await retrieve(clean).catch(() => ({ chunks: [], method: 'none' }));

  let reply;
  let source = 'ai';
  let sources = [];
  try {
    const systemPrompt = `${buildSystemPrompt(crewId)}\n\n<nasa_sources>\n${toPromptSources(chunks)}\n</nasa_sources>`;
    reply = await askGemini({ systemPrompt, history: toGeminiHistory(history), message: clean });
    // No self-harm / "unable to cope" signs in the "Get help now" line unless she mentioned mood (checkReply.js).
    reply = trimOffTopicWarnings(reply, clean, { redFlag: flag });
    sources = citedSources(reply, chunks);
    // Safety net: if our check found an emergency, the answer MUST open with the emergency line.
    if (flag && !reply.slice(0, 120).includes('⚠️')) reply = `⚠️ **${emergencyLine(officer).replace('⚠️ ', '')}**\n${reply}`;
  } catch (err) {
    console.warn('[doctor] AI failed, using a saved demo answer:', err.name === 'AbortError' ? 'timeout' : err.message);
    reply = demoAnswer(clean, { redFlag: Boolean(flag), officer });
    source = 'demo';
  }

  // The id is made here, so the app gets it at once and can send this answer to Earth later, even after a reload.
  const id = dbReady() ? new mongoose.Types.ObjectId() : null;
  const answer = { id: id ? String(id) : null, reply, redFlag: Boolean(flag), redFlagReason: flag ? flag.reason : null, source, sources };
  if (id) {
    const { id: _ignored, ...fields } = answer;
    saveMessage({ _id: id, crewId, question: clean, ...fields, searchMethod: method });
  }
  console.log(`[doctor] ${source} answer, NASA search: ${method}, ${chunks.length} passages found, ${sources.length} pages cited${dbReady() ? ', saved' : ''}`);
  res.json(answer);
});

export default router;
