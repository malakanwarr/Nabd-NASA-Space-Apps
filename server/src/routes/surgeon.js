// Flight surgeon routes (owner: Hana Haytham).
//   POST /api/surgeon/:crewId/notes  body: { messageId?, question, reply, redFlag?, redFlagReason?, sources? }
//        She sends ONE AI doctor answer to Earth (she chooses which). The server saves a short note at once
//        (plain summary, so sending is instant), answers { note: { id, summary, sentAt, arrivesAt, ... }, saved },
//        then swaps in the AI-written summary in the background. Sending the same answer twice returns the first note.
//   GET  /api/surgeon/:crewId
//        What the flight surgeon page shows: { flightSurgeon, delayText, notes (newest first), database }.
//        ONLY the answers she chose to send: her other AI doctor chats stay on the ship ("by choice" in her profile).
//        Without MongoDB it shows the sample notes from data/surgeon-notes.json instead.
import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/genai';
import SurgeonNote from '../models/SurgeonNote.js';

const router = Router();

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../data');
const SUMMARY_TIMEOUT_MS = 10000;
const MAX_TEXT = 4000;

function readData(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, `${name}.json`), 'utf8'));
  } catch {
    return null;
  }
}

// One-way delay to Earth from data/mission.json (18 min 24 s in the sample mission).
function earthDelay() {
  const d = readData('mission')?.earthDelayOneWay;
  const ms = d ? (d.minutes * 60 + d.seconds) * 1000 : (18 * 60 + 24) * 1000;
  return { ms, text: d?.text || '18 min 24 s' };
}

const dbReady = () => mongoose.connection.readyState === 1;

// ---------------------------------------------------------------- the note for Earth

let ai = null;
function getAi() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!ai) ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return ai;
}

// Plain text for the note: no **bold**, no [1] markers, no ⚠️, single spaces.
const plain = (t) => String(t || '').replace(/\*+/g, '').replace(/\s*\[\d+(,\s*\d+)*\]/g, '').replace(/⚠️/g, '').replace(/\s+/g, ' ').trim();

// Backup note when the AI is down, so sending never fails because of Gemini.
function plainSummary({ question, reply, redFlag, redFlagReason }) {
  const firstSentence = plain(reply).split(/(?<=[.!?])\s/)[0] || '';
  const flag = redFlag ? ` Red flag: ${String(redFlagReason || 'danger sign').toLowerCase()}; told to contact the crew medical officer.` : '';
  // The question keeps its own full stop or question mark, inside the quotes: never ".".
  const asked = plain(question);
  const end = /[.!?]$/.test(asked) ? '' : '.';
  return `Asked: "${asked}${end}" AI doctor: ${firstSentence}${flag}`.slice(0, 600);
}

async function aiSummary(exchange) {
  const client = getAi();
  if (!client) throw new Error('GEMINI_API_KEY is not set');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUMMARY_TIMEOUT_MS);
  try {
    const result = await client.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                `Astronaut asked the onboard AI doctor:\n${plain(exchange.question)}\n\n` +
                `The AI doctor answered:\n${plain(exchange.reply)}\n\n` +
                (exchange.redFlag ? `The ship's emergency check flagged: ${exchange.redFlagReason}.\n\n` : '') +
                'Write the note for the flight surgeon.',
            },
          ],
        },
      ],
      config: {
        systemInstruction:
          'You write short notes from a spacecraft to the flight surgeon on Earth. In at most 2 sentences and 60 words, ' +
          'state the symptom or question, the advice the AI doctor gave, and any red flag. Plain clinical English, ' +
          'no greeting, no markdown. Use only facts from the exchange; never add a diagnosis or new advice.',
        temperature: 0.2,
        maxOutputTokens: 512,
        abortSignal: controller.signal,
      },
    });
    const text = plain(result.text);
    if (!text) throw new Error('empty summary');
    return text.slice(0, 600);
  } finally {
    clearTimeout(timer);
  }
}

// Shape sent to the app: no Mongo internals.
function toNote(doc, now = Date.now()) {
  return {
    id: doc._id ? String(doc._id) : null,
    summary: doc.summary,
    summaryBy: doc.summaryBy,
    question: doc.question,
    reply: doc.reply,
    redFlag: Boolean(doc.redFlag),
    redFlagReason: doc.redFlagReason || null,
    sources: doc.sources || [],
    sentAt: doc.sentAt,
    arrivesAt: doc.arrivesAt,
    arrived: new Date(doc.arrivesAt).getTime() <= now,
    surgeonReply: doc.surgeonReply?.text ? doc.surgeonReply : null,
  };
}

function crewSample(crewId) {
  const crew = readData('crew')?.crew || [];
  return crew.find((member) => String(member.id) === String(crewId)) || null;
}

function toCrewDetail({ crewId, member, notes, sharedWithConsent, draftReply, database, flightSurgeon, delayText }) {
  const today = readData('today') || {};
  return {
    crewId,
    flightSurgeon,
    delayText,
    database,
    vitals: today.vitals || {},
    sleepLastNightHours: today.sleepLastNightHours ?? null,
    allergies: Array.isArray(member?.allergies) ? member.allergies : [],
    notes: notes.map((note) => ({
      id: note.id || note._id || null,
      text: note.text || note.summary || note.content || '',
      summary: note.summary || note.text || note.content || '',
      sentShipTime: note.sentShipTime || (note.sentAt ? new Date(note.sentAt).toISOString().slice(0, 16) : null),
      arrivedEarthTime: note.arrivedEarthTime || (note.arrivesAt ? new Date(note.arrivesAt).toISOString().slice(0, 16) : null),
      sentAt: note.sentAt || null,
      arrivesAt: note.arrivesAt || null,
      arrived: note.arrived ?? (note.arrivesAt ? new Date(note.arrivesAt).getTime() <= Date.now() : false),
      energyScore: note.energyScore ?? null,
      sample: Boolean(note.sample),
    })),
    sharedWithConsent: sharedWithConsent && sharedWithConsent.astronautId === crewId ? sharedWithConsent : null,
    draftReply: draftReply || '',
  };
}

// ---------------------------------------------------------------- routes

router.get('/', (req, res) => res.json({ ok: true, feature: 'surgeon', database: dbReady() }));

router.post('/:crewId/notes', async (req, res) => {
  const { messageId, question, reply, redFlag, redFlagReason, sources } = req.body || {};
  if (typeof question !== 'string' || !question.trim() || typeof reply !== 'string' || !reply.trim()) {
    return res.status(400).json({ error: 'Pick an AI doctor answer to send.' });
  }
  const exchange = {
    question: question.slice(0, MAX_TEXT),
    reply: reply.slice(0, MAX_TEXT),
    redFlag: Boolean(redFlag),
    redFlagReason: typeof redFlagReason === 'string' ? redFlagReason.slice(0, 100) : null,
    sources: Array.isArray(sources)
      ? sources.slice(0, 5).map((s) => ({ n: Array.isArray(s?.n) ? s.n.map(Number).filter(Number.isFinite) : [], title: String(s?.title || ''), url: String(s?.url || '') }))
      : [],
  };

  const crewId = req.params.crewId;
  const linkId = typeof messageId === 'string' && /^[a-f0-9]{24}$/i.test(messageId) ? messageId : null;
  const sentAt = new Date();
  const doc = {
    crewId,
    messageId: linkId,
    summary: plainSummary(exchange),
    summaryBy: 'plain',
    ...exchange,
    sentAt,
    arrivesAt: new Date(sentAt.getTime() + earthDelay().ms),
  };

  if (!dbReady()) {
    console.warn('[surgeon] no database: the note is shown but not saved');
    return res.json({ note: toNote(doc), saved: false });
  }
  try {
    // Already sent? Return the first note instead of a second copy.
    const existing = linkId ? await SurgeonNote.findOne({ crewId, messageId: linkId }).lean() : null;
    if (existing) return res.json({ note: toNote(existing), saved: true });

    const saved = await SurgeonNote.create(doc);
    console.log(`[surgeon] note for ${crewId} saved, arrives ${saved.arrivesAt.toISOString()}`);
    res.json({ note: toNote(saved), saved: true });

    // After answering: replace the plain summary with the AI one. If the AI is down, the plain one stays.
    aiSummary(exchange)
      .then((summary) => SurgeonNote.updateOne({ _id: saved._id }, { summary, summaryBy: 'ai' }))
      .then(() => console.log(`[surgeon] AI summary added to the note for ${crewId}`))
      .catch((err) => console.warn('[surgeon] AI summary failed, keeping the plain one:', err.name === 'AbortError' ? 'timeout' : err.message));
  } catch (err) {
    console.warn('[surgeon] could not save the note:', err.message);
    res.status(500).json({ error: 'Could not send to Earth. Please try again.' });
  }
});

router.get('/:crewId', async (req, res) => {
  const { crewId } = req.params;
  const member = crewSample(crewId);
  if (!member) {
    return res.status(404).json({ error: 'Crew member not found.' });
  }

  const delay = earthDelay();
  const flightSurgeon = readData('mission')?.flightSurgeonOnEarth || readData('crew')?.mission?.flightSurgeon || 'Flight surgeon';
  const sample = readData('surgeon-notes');

  if (!dbReady()) {
    const notes = (sample?.notes || [])
      .filter((n) => String(n.astronautId) === String(crewId))
      .map((n) => ({
        id: n.id || null,
        summary: n.text,
        text: n.text,
        sentAt: n.sentShipTime,
        arrivesAt: n.arrivedEarthTime,
        sentShipTime: n.sentShipTime,
        arrivedEarthTime: n.arrivedEarthTime,
        arrived: true,
        energyScore: n.energyScore ?? null,
        sample: true,
      }));

    return res.json(toCrewDetail({
      crewId,
      member,
      notes,
      sharedWithConsent: sample?.sharedWithConsent?.astronautId === crewId ? sample.sharedWithConsent : null,
      draftReply: sample?.draftReply || '',
      database: false,
      flightSurgeon,
      delayText: delay.text,
    }));
  }

  try {
    const notes = await SurgeonNote.find({ crewId }).sort({ sentAt: -1 }).limit(50).lean();
    const latest = await SurgeonNote.findOne({ crewId }).sort({ sentAt: -1 }).lean();
    const now = Date.now();
    const transformed = notes.map((n) => ({
      id: n._id ? String(n._id) : null,
      summary: n.summary,
      text: n.summary,
      sentAt: n.sentAt,
      arrivesAt: n.arrivesAt,
      sentShipTime: n.sentAt ? new Date(n.sentAt).toISOString().slice(0, 16) : null,
      arrivedEarthTime: n.arrivesAt ? new Date(n.arrivesAt).toISOString().slice(0, 16) : null,
      arrived: n.arrivesAt ? new Date(n.arrivesAt).getTime() <= now : false,
      energyScore: null,
      sample: false,
    }));

    res.json(toCrewDetail({
      crewId,
      member,
      notes: transformed,
      sharedWithConsent: sample?.sharedWithConsent?.astronautId === crewId ? sample.sharedWithConsent : null,
      draftReply: latest?.surgeonReply?.text || sample?.draftReply || '',
      database: true,
      flightSurgeon,
      delayText: delay.text,
    }));
  } catch (err) {
    console.warn('[surgeon] could not load the crew data:', err.message);
    res.status(500).json({ error: 'Could not load this crew member.' });
  }
});

router.post('/:crewId/reply', async (req, res) => {
  const { crewId } = req.params;
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) {
    return res.status(400).json({ error: 'Write a message before sending it to the crew member.' });
  }

  const sentAt = new Date();
  try {
    if (!dbReady()) {
      return res.json({ ok: true, sent: false, deliveredAt: new Date(sentAt.getTime() + earthDelay().ms) });
    }

    const latest = await SurgeonNote.findOne({ crewId }).sort({ sentAt: -1 }).lean();
    if (latest) {
      await SurgeonNote.updateOne({ _id: latest._id }, { surgeonReply: { text: message, repliedAt: sentAt } });
    }

    res.json({ ok: true, sent: true, deliveredAt: new Date(sentAt.getTime() + earthDelay().ms) });
  } catch (err) {
    console.warn('[surgeon] could not send the reply:', err.message);
    res.status(500).json({ error: 'The reply could not be sent.' });
  }
});

export default router;
