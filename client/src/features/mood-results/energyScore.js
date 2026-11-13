// Energy score (owner: Malak).
// computeEnergyScore(face, voice, baseline, reactionMs) -> { energyScore, label }
//
// How it works, in plain words:
//   Every number is compared with Sara's normal from data/baseline.json, always in the
//   "tired" direction: more blinks, heavier eyelids, fewer smiles, flatter pitch, quieter
//   voice, more pauses, slower pace, slower reaction.
//   Each one is turned into a share of a "span": how far that number moves on a clearly
//   tired day. The shares are averaged with the weights below and taken off a baseline
//   score of 84. Numbers that are missing (no camera, no reaction test) are simply left
//   out and the remaining weights are shared again, so voice only still gives a score.

// The score Sara gets on a day exactly like her baseline.
const BASE_SCORE = 84;

// How many points the score loses when every number is a full span into the tired side.
const POINTS_PER_SPAN = 30;

// Below this, the day is "tired".
const TIRED_BELOW = 78;

// Sara's baseline has no loudness, so we use the value from her first sample day,
// which matches her baseline on every other number (data/mood-checkins.json, day 136).
const BASELINE_LOUDNESS = 0.06;

// One entry per number we can measure.
//   where     which object it comes from
//   dir       -1 if a SMALLER number means tired, +1 if a BIGGER number means tired
//   span      how far it moves on a clearly tired day (the unit we measure in)
//   weight    how much it counts
const SIGNALS = [
  { key: 'blinksPerMin', where: 'face', dir: 1, span: 10, weight: 0.15 },
  { key: 'eyeOpenness', where: 'face', dir: -1, span: 0.16, weight: 0.15 },
  { key: 'smileRate', where: 'face', dir: -1, span: 0.18, weight: 0.1 },
  { key: 'pitchRangeHz', where: 'voice', dir: -1, span: 32, weight: 0.15 },
  { key: 'loudness', where: 'voice', dir: -1, span: 0.026, weight: 0.1 },
  { key: 'pauseRatio', where: 'voice', dir: 1, span: 0.13, weight: 0.1 },
  { key: 'paceSegmentsPerSec', where: 'voice', dir: -1, span: 1.1, weight: 0.15 },
  { key: 'reactionTimeMs', where: 'reaction', dir: 1, span: 90, weight: 0.1 },
];

// A number is only used if it really is a number.
function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

// Sara's normal values: accepts the whole data/baseline.json or just its "mood" part.
function normals(baseline) {
  const mood = (baseline && baseline.mood) || baseline || {};
  return {
    blinksPerMin: mood.blinksPerMin,
    eyeOpenness: mood.eyeOpenness,
    smileRate: mood.smileRate,
    pitchRangeHz: mood.pitchRangeHz,
    loudness: isNumber(mood.loudness) ? mood.loudness : BASELINE_LOUDNESS,
    pauseRatio: mood.pauseRatio,
    paceSegmentsPerSec: mood.paceSegmentsPerSec,
    reactionTimeMs: (baseline && baseline.reactionTimeMs) || undefined,
  };
}

// How far one number has moved toward tired, as a share of its span.
// Better than normal counts the same as normal: the score says how close today is to
// Sara's normal day, so a good day sits at her baseline score and never above it.
function shareOfSpan(signal, today, normal) {
  const moved = (today - normal) * signal.dir;
  return clamp(moved / signal.span, 0, 1.2);
}

/**
 * Today's energy, compared with Sara's normal.
 * face     { blinksPerMin, eyeOpenness, smileRate } or null in voice-only mode
 * voice    { pitchRangeHz, loudness, pauseRatio, paceSegmentsPerSec } or null
 * baseline data/baseline.json
 * reactionMs  Salma's reaction time in milliseconds, optional
 * Returns { energyScore, label } and energyScore is null when there is nothing to measure.
 */
export function computeEnergyScore(face, voice, baseline, reactionMs) {
  const normal = normals(baseline);
  const today = { face: face || {}, voice: voice || {}, reaction: { reactionTimeMs: reactionMs } };

  let weighted = 0;
  let used = 0;

  for (const signal of SIGNALS) {
    const value = today[signal.where][signal.key === 'reactionTimeMs' ? 'reactionTimeMs' : signal.key];
    const normalValue = normal[signal.key];
    if (!isNumber(value) || !isNumber(normalValue) || !normalValue) continue;
    weighted += signal.weight * shareOfSpan(signal, value, normalValue);
    used += signal.weight;
  }

  if (!used) return { energyScore: null, label: null };

  const tiredness = weighted / used;
  const energyScore = Math.round(clamp(BASE_SCORE - POINTS_PER_SPAN * tiredness, 0, 100));
  return { energyScore, label: energyScore < TIRED_BELOW ? 'tired' : 'ok' };
}

// The words and the status colour that go with a label.
export function labelWords(label) {
  if (label === 'tired') return { title: 'Tired, not low mood', status: 'watch' };
  if (label === 'ok') return { title: 'Steady energy', status: 'stable' };
  return { title: 'No score yet', status: 'watch' };
}

// Rounds a share into plain words for the "What changed" list: "24% flatter", "15% heavier".
function percentAway(today, normal) {
  return Math.round(Math.abs((today - normal) / normal) * 100);
}

/**
 * The "What changed" list on the results screen: one row per number we measured,
 * biggest change first, each with a word for the direction and whether it is a tired sign.
 * Returns [{ key, name, value, detail, tired }]
 */
export function describeChanges(face, voice, baseline, reactionMs) {
  const normal = normals(baseline);
  const rows = [];

  function add(key, name, value, normalValue, dir, worse, better, format) {
    if (!isNumber(value) || !isNumber(normalValue) || !normalValue) return;
    const away = percentAway(value, normalValue);
    const tired = (value - normalValue) * dir > 0;
    rows.push({
      key,
      name,
      value: format(value),
      detail: away < 3 ? 'about usual' : `${away}% ${tired ? worse : better}`,
      tired: tired && away >= 3,
      away,
    });
  }

  const f = face || {};
  const v = voice || {};
  add('blinksPerMin', 'Blinking', f.blinksPerMin, normal.blinksPerMin, 1, 'more', 'fewer', (n) => `${Math.round(n)} a min`);
  add('eyeOpenness', 'Eyelids', f.eyeOpenness, normal.eyeOpenness, -1, 'heavier', 'wider', (n) => `${Math.round(n * 100)}% open`);
  add('smileRate', 'Smiles', f.smileRate, normal.smileRate, -1, 'fewer', 'more', (n) => `${Math.round(n * 100)}%`);
  add('pitchRangeHz', 'Pitch range', v.pitchRangeHz, normal.pitchRangeHz, -1, 'flatter', 'livelier', (n) => `${Math.round(n)} Hz`);
  add('loudness', 'Loudness', v.loudness, normal.loudness, -1, 'quieter', 'louder', (n) => n.toFixed(3));
  add('pauseRatio', 'Pauses', v.pauseRatio, normal.pauseRatio, 1, 'longer', 'shorter', (n) => `${Math.round(n * 100)}% of the time`);
  add('paceSegmentsPerSec', 'Speaking pace', v.paceSegmentsPerSec, normal.paceSegmentsPerSec, -1, 'slower', 'faster', (n) => n.toFixed(1));
  add('reactionTimeMs', 'Reaction time', reactionMs, normal.reactionTimeMs, 1, 'slower', 'faster', (n) => `${Math.round(n)} ms`);

  return rows.sort((a, b) => b.away - a.away);
}

export default computeEnergyScore;
