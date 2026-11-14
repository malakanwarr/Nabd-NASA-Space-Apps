// Finds the NASA passages that best match the astronaut's question (owner: Hana Haytham).
//   retrieve(question)  -> { chunks: [...best matches], method: 'embedding' | 'keyword' | 'none' }
//
// 1. Meaning search: Gemini turns the question into numbers (same model that built the library)
//    and we compare them with every chunk in kb/knowledge_base.json. Takes ~1 ms after the Gemini call.
// 2. Keyword backup: if Gemini can't be reached (no internet, no key, slow), we search by words
//    instead, with a small list of everyday words -> NASA risks ("blurry" -> SANS). Works fully offline.
// Weak matches are dropped, so an unrelated question ("I bumped my elbow") gets no NASA passages.
//
// Test from server/:  node src/doctor/retrieve.js "my vision is blurry"
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const here = path.dirname(fileURLToPath(import.meta.url));
const LIBRARY_FILE = path.join(here, 'kb', 'knowledge_base.json');

const TOP_K = 4; // passages handed to the doctor
const MAX_PER_PAGE = 2; // so one NASA page can't fill every slot
const EMBED_TIMEOUT_MS = 4000; // the chat must stay fast; past this we use keywords
// Lowest meaning-match score we accept (1 = identical). Tune it with the test command above.
// 0.58 from testing (library with 87 passages, incl. the CO2 brief): the weakest good match was
// "I feel lonely" -> Behavioral 0.584; weak noise like headache -> Vestibular scored 0.574.
// Don't go much higher: good and weak matches overlap (e.g. "bumped my elbow" -> Zero T2 scored 0.591).
const MIN_SCORE = Number(process.env.KB_MIN_SCORE) || 0.58;

// ---------------------------------------------------------------- the library

let library = null;

// Loads the library once. If the file is missing or broken, the doctor keeps working without NASA passages.
function getLibrary() {
  if (library) return library;
  try {
    const data = JSON.parse(fs.readFileSync(LIBRARY_FILE, 'utf8'));
    const chunks = Array.isArray(data.chunks) ? data.chunks : [];
    library = { ...data, chunks, keyword: buildKeywordIndex(chunks) };
    console.log(`[doctor] NASA library loaded: ${chunks.length} passages${data.embedModel ? `, ${data.embedModel}` : ', no embeddings'}`);
  } catch (err) {
    console.warn('[doctor] NASA library not loaded (run: node src/doctor/kb/build.js):', err.message);
    library = { chunks: [], keyword: buildKeywordIndex([]) };
  }
  return library;
}

// ---------------------------------------------------------------- 1. meaning search

let ai = null;
function getAi() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!ai) ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return ai;
}

async function embedQuestion(question, lib) {
  const client = getAi();
  if (!client) throw new Error('GEMINI_API_KEY is not set');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMBED_TIMEOUT_MS);
  try {
    const res = await client.models.embedContent({
      model: lib.embedModel,
      contents: [question],
      // RETRIEVAL_QUERY pairs with the RETRIEVAL_DOCUMENT setting the chunks were built with.
      config: { taskType: 'RETRIEVAL_QUERY', outputDimensionality: lib.embedDims, abortSignal: controller.signal },
    });
    const values = res.embeddings?.[0]?.values;
    if (!values?.length) throw new Error('empty embedding');
    const n = Math.hypot(...values) || 1;
    return values.map((x) => x / n);
  } finally {
    clearTimeout(timer);
  }
}

// Chunks are stored at unit length, so the dot product is the cosine similarity.
function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function meaningSearch(qVec, lib) {
  return lib.chunks
    .filter((c) => Array.isArray(c.embedding) && c.embedding.length === qVec.length)
    .map((c) => ({ chunk: c, score: dot(qVec, c.embedding) }))
    .filter((r) => r.score >= MIN_SCORE);
}

// ---------------------------------------------------------------- 2. keyword backup

const STOP = new Set(
  'a an the and or but if of to in on at for from with by about as is are was were be been being am i im me my mine we our you your she her he his it its they them this that these those there here have has had do does did done not no so very really just since today yesterday now still up out off one day days hour hours week am pm also too can could would should will what when why how which who feel feeling felt get got been keep keeps lot bit some any more most than then'.split(' ')
);

// Everyday words an astronaut might type -> the NASA risk they point to.
const HINTS = {
  sans: ['vision', 'blurry', 'blurred', 'eye', 'eyes', 'sight', 'see', 'headache', 'pressure', 'optic'],
  sensorimotor: ['dizzy', 'dizziness', 'nausea', 'nauseous', 'vomit', 'motion', 'sick', 'balance', 'spinning', 'vertigo', 'disoriented', 'landing', 'coordination'],
  cardiovascular: ['heart', 'chest', 'pulse', 'blood', 'faint', 'fainting', 'lightheaded', 'clot', 'swollen', 'swelling', 'palpitation', 'arrhythmia'],
  sleep: ['sleep', 'insomnia', 'tired', 'fatigue', 'exhausted', 'awake', 'waking', 'nap', 'circadian', 'schedule', 'shift'],
  behavioral: ['lonely', 'alone', 'isolated', 'isolation', 'sad', 'down', 'anxious', 'anxiety', 'stress', 'stressed', 'depressed', 'mood', 'homesick', 'focus', 'concentrate', 'cope', 'worry'],
  teamwork: ['crew', 'crewmate', 'conflict', 'argument', 'argue', 'team', 'tension', 'colleague'],
  bone: ['bone', 'bones', 'fracture', 'hip', 'spine', 'osteoporosis', 'density'],
  fitness: ['muscle', 'muscles', 'strength', 'weak', 'exercise', 'workout', 'treadmill', 'fitness'],
  radiation_cancer: ['radiation', 'cancer', 'solar', 'storm', 'flare', 'dose', 'shielding'],
  hypoxia: ['oxygen', 'breath', 'breathless', 'altitude', 'confused', 'confusion'],
  decompression: ['bends', 'decompression', 'joint', 'joints', 'nitrogen', 'prebreathe'],
  eva: ['spacewalk', 'eva', 'suit', 'spacesuit'],
  immune: ['rash', 'cold', 'sore', 'shingles', 'allergy', 'allergic', 'infection', 'fever', 'virus', 'immune'],
  microbes: ['infection', 'bacteria', 'germs', 'stomach', 'gut', 'microbes'],
  nutrition: ['food', 'eat', 'eating', 'appetite', 'diet', 'meal', 'meals', 'hungry', 'vitamin', 'nutrition'],
  dynamic_loads: ['landing', 'impact', 'seat', 'injury'],
  systems_support: ['equipment', 'software', 'broken', 'repair', 'system'],
};

// Very light stemming so "headaches" matches "headache" and "sleeping" matches "sleep".
function stem(w) {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

function tokens(text) {
  // Letters only: numbers like "3 am" or "5%" match too many unrelated passages.
  return (text.toLowerCase().replace(/[‘’']/g, '').match(/[a-z]+/g) || []).filter((w) => w.length > 1 && !STOP.has(w)).map(stem);
}

const HINT_STEMS = Object.fromEntries(Object.entries(HINTS).map(([risk, list]) => [risk, new Set(list.map(stem))]));

function buildKeywordIndex(chunks) {
  const docs = chunks.map((c) => {
    const tf = new Map();
    for (const t of tokens(`${c.title} ${c.section} ${c.text}`)) tf.set(t, (tf.get(t) || 0) + 1);
    return { tf, length: [...tf.values()].reduce((a, b) => a + b, 0) || 1 };
  });
  const df = new Map();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  const avgLength = docs.reduce((s, d) => s + d.length, 0) / (docs.length || 1);
  return { docs, df, avgLength, n: docs.length };
}

// BM25 word scoring, plus a boost of 3 per everyday word in the question that points to the chunk's risk.
function keywordSearch(question, lib) {
  const { docs, df, avgLength, n } = lib.keyword;
  const q = [...new Set(tokens(question))];
  if (!q.length || !n) return [];
  // How many everyday words in the question point to each risk ("dizzy" + "landing" -> sensorimotor 2).
  const hints = new Map(Object.entries(HINT_STEMS).map(([risk, set]) => [risk, q.filter((t) => set.has(t)).length]).filter(([, n]) => n));

  return lib.chunks
    .map((chunk, i) => {
      const d = docs[i];
      let score = 0;
      for (const t of q) {
        const f = d.tf.get(t);
        if (!f) continue;
        const idf = Math.log(1 + (n - df.get(t) + 0.5) / (df.get(t) + 0.5));
        score += (idf * f * 2.2) / (f + 1.2 * (0.25 + 0.75 * (d.length / avgLength)));
      }
      score += 3 * (hints.get(chunk.risk) || 0);
      return { chunk, score };
    })
    .filter((r) => r.score >= 2); // needs a real word match or a risk hint
}

// ---------------------------------------------------------------- pick the best

function pickTop(results) {
  const perPage = new Map();
  const picked = [];
  for (const r of results.sort((a, b) => b.score - a.score)) {
    const page = r.chunk.source_url;
    if ((perPage.get(page) || 0) >= MAX_PER_PAGE) continue;
    perPage.set(page, (perPage.get(page) || 0) + 1);
    picked.push({
      id: r.chunk.id,
      title: r.chunk.title,
      section: r.chunk.section,
      risk: r.chunk.risk,
      source_url: r.chunk.source_url,
      text: r.chunk.text,
      score: Number(r.score.toFixed(3)),
    });
    if (picked.length >= TOP_K) break;
  }
  return picked;
}

/**
 * @param {string} question what the astronaut typed
 * @returns {Promise<{ chunks: object[], method: 'embedding' | 'keyword' | 'none' }>}
 */
export async function retrieve(question) {
  const lib = getLibrary();
  if (typeof question !== 'string' || !question.trim() || !lib.chunks.length) return { chunks: [], method: 'none' };

  if (lib.embedModel && lib.embedDims) {
    try {
      const qVec = await embedQuestion(question, lib);
      return { chunks: pickTop(meaningSearch(qVec, lib)), method: 'embedding' };
    } catch (err) {
      console.warn('[doctor] meaning search failed, using keywords:', err.name === 'AbortError' ? 'timeout' : err.message);
    }
  }
  return { chunks: pickTop(keywordSearch(question, lib)), method: 'keyword' };
}

// ---------------------------------------------------------------- helpers for doctor.js

// The passages as numbered sources for the prompt: [1], [2], ...
export function toPromptSources(chunks) {
  if (!chunks.length) return 'No NASA passage matches this question.';
  return chunks.map((c, i) => `[${i + 1}] ${c.title} (${c.section})\n${c.text}`).join('\n\n');
}

// One entry per page for the chat's "Sources" line, numbered like the prompt.
export function toSourceList(chunks) {
  const seen = new Map();
  chunks.forEach((c, i) => {
    if (!seen.has(c.source_url)) seen.set(c.source_url, { n: [], title: c.title, url: c.source_url });
    seen.get(c.source_url).n.push(i + 1);
  });
  return [...seen.values()];
}

// ---------------------------------------------------------------- test from the terminal

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await import('dotenv/config');
  const question = process.argv.slice(2).join(' ') || 'my vision has been blurry since yesterday';
  const { chunks, method } = await retrieve(question);
  console.log(`\nQuestion: "${question}"\nSearch: ${method}, min score ${MIN_SCORE}\n`);
  if (!chunks.length) console.log('No NASA passage matched.');
  for (const c of chunks) console.log(`  ${String(c.score).padEnd(6)} ${c.title}  |  ${c.section}\n         ${c.text.slice(0, 110)}...\n`);
}