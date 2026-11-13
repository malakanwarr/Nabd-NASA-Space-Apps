// Builds the AI doctor's NASA library (owner: Hana Haytham).
// Run from server/:   node src/doctor/kb/build.js
// Options:            --no-embed       chunks only, skip Gemini (keyword search still works)
//                     --only=sans,bone build just these source ids (for testing)
//
// Steps: download each page in sources.js -> keep the article text -> cut into ~200-word chunks
//        -> embed each chunk with Gemini -> write knowledge_base.json next to this file.
// If a page can't be downloaded, put its text by hand in kb/manual/<id>.txt and run again.
// Needs no new packages: Node's built-in fetch, plus @google/genai and dotenv already in server/.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import { SOURCES, HAZARDS } from './sources.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(here, 'knowledge_base.json');
const MANUAL_DIR = path.join(here, 'manual');

const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
const EMBED_DIMS = 768; // smaller than the default 3072: plenty for ~150 chunks, and a smaller file
const EMBED_BATCH = 20;
const CHUNK_WORDS = 200; // target size; a chunk closes at the first paragraph break past this
const MIN_CHUNK_WORDS = 40; // a shorter tail is merged into the chunk before it
const FETCH_TIMEOUT_MS = 20000;

const args = process.argv.slice(2);
const NO_EMBED = args.includes('--no-embed');
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);

// ---------------------------------------------------------------- 1. download

async function download(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (NABD hackathon knowledge-base builder)', Accept: 'text/html' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------- 2. clean

function decodeEntities(s) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', deg: '°' };
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (all, n) => named[n.toLowerCase()] ?? all);
}

const clean = (s) => decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const words = (s) => (s ? s.split(/\s+/).length : 0);

// Turns HTML into an ordered list of blocks: { kind: 'heading' | 'text', text }.
function htmlToBlocks(html) {
  const body = html
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const blocks = [];
  const re = /<(h[1-6]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi; // image captions are skipped on purpose
  let m;
  while ((m = re.exec(body))) {
    const text = clean(m[2]);
    if (!text) continue;
    blocks.push({ kind: m[1].toLowerCase().startsWith('h') ? 'heading' : 'text', text });
  }
  return blocks;
}

// Where NASA's article ends and the "related content" / footer begins.
const END_MARKERS = /^(related content|top risks addressed|risks addressed|keep exploring|discover more topics|national aeronautics and space administration|explore more|was this page helpful)/i;
// Lines that are page furniture, not article text.
const NOISE = /(\d+ min read|read more|^credit:|^image credit|^share$|^article \d|page last updated|page editor|responsible nasa official)/i;

// Keeps only the article: from the page's own title heading to the first end marker.
function extractArticle(blocks, source) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const title = norm(source.title);
  let start = blocks.findIndex((b) => b.kind === 'heading' && norm(b.text) === title);
  if (start === -1) start = blocks.findIndex((b) => b.kind === 'heading' && norm(b.text).startsWith(title.slice(0, 30)));

  let picked;
  if (start !== -1) {
    picked = [];
    for (const b of blocks.slice(start + 1)) {
      if (END_MARKERS.test(b.text)) break;
      picked.push(b);
    }
  } else {
    // No title heading found: fall back to long paragraphs only, which skips menus and link lists.
    picked = blocks.filter((b) => b.kind === 'text' && words(b.text) >= 25);
  }
  return picked.filter((b) => !NOISE.test(b.text) && (b.kind === 'heading' || words(b.text) >= 6));
}

// Text typed by hand for pages that block downloads: blank line between paragraphs, "## " for headings.
function readManual(id) {
  const file = path.join(MANUAL_DIR, `${id}.txt`);
  if (!fs.existsSync(file)) return null;
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p.startsWith('#') ? { kind: 'heading', text: p.replace(/^#+\s*/, '') } : { kind: 'text', text: p.replace(/\s+/g, ' ') }));
}

// ---------------------------------------------------------------- 3. chunk

// Groups sentences into pieces of about CHUNK_WORDS words.
function splitSentences(text) {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [text];
  const pieces = [];
  let cur = '';
  for (const s of sentences) {
    if (cur && words(cur) + words(s) > CHUNK_WORDS) {
      pieces.push(cur.trim());
      cur = '';
    }
    cur += s;
  }
  if (cur.trim()) pieces.push(cur.trim());
  return pieces;
}

function chunkBlocks(blocks, source) {
  const chunks = [];
  let section = 'Overview';
  let buf = [];
  let bufSection = section;

  const flush = () => {
    const text = buf.join(' ').trim();
    buf = [];
    if (!text) return;
    const last = chunks[chunks.length - 1];
    if (words(text) < MIN_CHUNK_WORDS && last && last.section === bufSection) {
      last.text += ' ' + text; // short tail: join it to the chunk before
    } else {
      chunks.push({ section: bufSection, text });
    }
  };

  for (const b of blocks) {
    if (b.kind === 'heading') {
      flush();
      section = b.text.replace(/\*+/g, '').trim();
      bufSection = section;
      continue;
    }
    // Very long paragraphs are cut at sentence ends so no chunk gets too big.
    const pieces = words(b.text) > CHUNK_WORDS * 1.5 ? splitSentences(b.text) : [b.text];
    for (const piece of pieces) {
      const have = words(buf.join(' '));
      if (have >= MIN_CHUNK_WORDS && have + words(piece) > CHUNK_WORDS * 1.25) flush();
      buf.push(piece);
      if (words(buf.join(' ')) >= CHUNK_WORDS) flush();
    }
  }
  flush();

  return chunks.map((c, i) => ({
    id: `${source.id}_${String(i + 1).padStart(2, '0')}`,
    title: source.title,
    section: c.section,
    type: source.type,
    category: source.category,
    hazards: source.hazards.map((h) => HAZARDS[h]),
    risk: source.risk,
    source_url: source.url,
    text: c.text,
  }));
}

// ---------------------------------------------------------------- 4. embed

// What gets embedded: title and section give each chunk its context.
export const embeddingText = (c) => `${c.title} | ${c.section}\n${c.text}`;

// Unit length, so search can compare chunks with a simple dot product.
function normalize(v) {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => Number((x / n).toFixed(6)));
}

async function embedAll(chunks) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set in server/.env');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH);
    let res;
    for (let attempt = 1; ; attempt++) {
      try {
        res = await ai.models.embedContent({
          model: EMBED_MODEL,
          contents: batch.map(embeddingText),
          config: { taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: EMBED_DIMS },
        });
        break;
      } catch (err) {
        if (attempt >= 3) throw err;
        console.warn(`  embedding batch failed (${err.message}), retrying in ${attempt * 3} s`);
        await new Promise((r) => setTimeout(r, attempt * 3000));
      }
    }
    const vectors = res.embeddings || [];
    if (vectors.length !== batch.length) throw new Error(`expected ${batch.length} embeddings, got ${vectors.length}`);
    batch.forEach((c, j) => (c.embedding = normalize(vectors[j].values)));
    console.log(`  embedded ${Math.min(i + EMBED_BATCH, chunks.length)}/${chunks.length}`);
  }
}

// ---------------------------------------------------------------- main

async function main() {
  const sources = ONLY.length ? SOURCES.filter((s) => ONLY.includes(s.id)) : SOURCES;
  const chunks = [];
  const report = [];

  console.log(`Building the NASA library from ${sources.length} pages...\n`);
  for (const source of sources) {
    let blocks = readManual(source.id);
    let from = 'manual';
    if (!blocks) {
      try {
        blocks = extractArticle(htmlToBlocks(await download(source.url)), source);
        from = 'web';
      } catch (err) {
        report.push({ id: source.id, status: `FAILED: ${err.name === 'AbortError' ? 'timeout' : err.message}` });
        continue;
      }
    }
    const pageChunks = chunkBlocks(blocks, source);
    const total = pageChunks.reduce((n, c) => n + words(c.text), 0);
    if (total < 80) {
      report.push({ id: source.id, status: `TOO SHORT (${total} words): check the page or add manual/${source.id}.txt` });
      continue;
    }
    chunks.push(...pageChunks);
    report.push({ id: source.id, status: `ok, ${pageChunks.length} chunks, ${total} words (${from})` });
    await new Promise((r) => setTimeout(r, 400)); // be polite to nasa.gov
  }

  for (const r of report) console.log(`  ${r.status.startsWith('ok') ? '✓' : '✗'} ${r.id.padEnd(22)} ${r.status}`);
  const failed = report.filter((r) => !r.status.startsWith('ok'));

  if (!chunks.length) {
    console.error('\nNo chunks were built, so knowledge_base.json was NOT changed.');
    process.exit(1);
  }

  let embedded = false;
  if (!NO_EMBED) {
    console.log(`\nEmbedding ${chunks.length} chunks with ${EMBED_MODEL}...`);
    try {
      await embedAll(chunks);
      embedded = true;
    } catch (err) {
      console.warn(`\nEmbedding failed (${err.message}). Saving chunks without embeddings; the doctor will use keyword search.`);
      chunks.forEach((c) => delete c.embedding);
    }
  }

  const library = {
    builtAt: new Date().toISOString(),
    embedModel: embedded ? EMBED_MODEL : null,
    embedDims: embedded ? EMBED_DIMS : null,
    count: chunks.length,
    chunks,
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(library, null, 1));
  console.log(`\nWrote ${chunks.length} chunks to ${path.relative(process.cwd(), OUT_FILE)}${embedded ? ' (with embeddings)' : ' (no embeddings)'}.`);
  if (failed.length) console.log(`${failed.length} page(s) need attention: see the ✗ lines above.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
