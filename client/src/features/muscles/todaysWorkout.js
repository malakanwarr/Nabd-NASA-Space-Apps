// Today's workout (owner: Layal). Pure functions only, no UI and no network, so the weekly plan can call
// todaysWorkout() once for each day.
//
// Three inputs:
// 1. Weak muscles (the twin): the 2 weakest groups are today's focus; exercises that train them as a main muscle.
// 2. Tiredness (Malak's daily check-in, GET /api/mood). energyScore.js saves label 'ok' (score 78 or more) or
//    'tired' (below 78). We split 'tired' once more:
//      'ok'                     -> rested     -> full    (4 sets, last set near max effort, interval cardio: NASA SPRINT)
//      'tired', score 60 to 77  -> tired      -> lighter (3 sets, no max set, steady 30 min cardio)
//      'tired', score below 60  -> very tired -> light   (mobility and an easy steady bike ride, no resistance)
//      no check-in at all       ->            -> lighter (safer to go easy than to push)
// 3. Cycle (female and cycle-tracking mode only; never for period suppression or male).
//    Why symptoms and not phases: research on training by cycle phase is mixed. McNulty et al., 2020
//    (meta-analysis, Sports Medicine) found performance at most trivially lower in the early follicular phase,
//    so changes are individual and based on what she logged. On a period day with Cramps or Tiredness logged
//    today or yesterday (within the current period), a full session drops to lighter: lower intensity, no max set.
//    Older logs never decide today. Otherwise nothing changes.
//
// Every level counts the same when completed (for the points race later): each finished exercise goes through
// completeWorkout() in muscleModel.js with the same restore, whatever the level.
import { EXERCISES, MUSCLES, muscleById } from './muscleModel.js';
import { computeCycle, isPeriodDay } from '../womens-health/helpers.js';
import { daysBetween, isIsoDate } from './storage.js';

export const TIRED_BELOW = 78; // same as energyScore.js, which saves the label
export const VERY_TIRED_BELOW = 60;
const CYCLE_SYMPTOMS = ['cramps', 'tiredness'];

const LEVEL_OF_ENERGY = { rested: 'full', tired: 'lighter', veryTired: 'light' };
const MINUTES_PER_SET = 2; // including rest
const INTERVAL_MINUTES = { cevisIntervals: 30, treadmillIntervals: 20 }; // with warm-up
const STEADY_MINUTES = 30;
const STEADY_NAMES = { cevisIntervals: 'CEVIS cycle, steady', treadmillIntervals: 'T2 treadmill with harness, steady' };
// Easy recovery between intervals. PROTOTYPE CHOICE: our sources do not give NASA SPRINT's recovery times,
// so these are our own: 4 × 4 min -> 3 min easy pedaling between; 8 × 30 s -> 60 s easy between.
export const INTERVAL_REST_SECONDS = { cevisIntervals: 180, treadmillIntervals: 60 };

// "4 × 4 min" -> { sets: 4, seconds: 240 }, "8 × 30 s" -> { sets: 8, seconds: 30 }
function parseIntervals(text) {
  const m = String(text).match(/(\d+)\s*×\s*(\d+)\s*(min|s)/);
  if (!m) return null;
  return { sets: Number(m[1]), seconds: Number(m[2]) * (m[3] === 'min' ? 60 : 1) };
}

// The newest check-in -> { level: 'rested' | 'tired' | 'veryTired' | null, score, date, isToday }.
export function energyLevel(checkins, today) {
  const list = (Array.isArray(checkins) ? checkins : []).filter((c) => c && Number.isFinite(c.energyScore));
  if (!list.length) return { level: null, score: null, date: null, isToday: false };
  const last = [...list]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || (a.missionDay || 0) - (b.missionDay || 0))
    .pop();
  const tired = last.label ? last.label === 'tired' : last.energyScore < TIRED_BELOW;
  const level = !tired ? 'rested' : last.energyScore < VERY_TIRED_BELOW ? 'veryTired' : 'tired';
  return { level, score: last.energyScore, date: last.date || null, isToday: last.date === today };
}

// Her cycle -> null (no cycle input) or { day, inPeriod, adjust }.
// data: womens-health.json from GET /api/womens/cycle; logs: her saved logs; mode: 'cycle' | 'suppression'.
export function cycleAdjustment({ gender, mode, data, logs, today }) {
  if (gender === 'male' || mode !== 'cycle' || !data || !data.cycleTracking) return null;
  const list = Array.isArray(logs) ? logs : [];
  const cyc = computeCycle(data.cycleTracking, list, today);
  const sinceStart = Math.max(0, (cyc.day || 1) - 1); // days since this cycle started
  const symptomatic = list.some((l) => {
    if (!l || !isIsoDate(l.date)) return false;
    const ago = daysBetween(l.date, today);
    if (ago < 0 || ago > 1 || ago > sinceStart) return false; // today or yesterday, in the current period
    if (l.area === 'period' && !isPeriodDay(l)) return false; // "My period ended" is not a symptom
    return (l.symptoms || []).some((x) => CYCLE_SYMPTOMS.includes(String(x).trim().toLowerCase()));
  });
  return { day: cyc.day, inPeriod: Boolean(cyc.inPeriod), adjust: Boolean(cyc.inPeriod) && symptomatic };
}

// The 2 weakest muscle groups (ties keep the model's order).
export function focusMuscles(strength, count = 2) {
  return [...MUSCLES]
    .map((m, i) => ({ id: m.id, v: Number(strength?.[m.id]), i }))
    .sort((a, b) => a.v - b.v || a.i - b.i)
    .slice(0, count)
    .map((m) => m.id);
}

function repsOf(sets) {
  const parts = String(sets).split('×');
  return (parts[1] || parts[0]).trim();
}

// Resistance: main exercises for each focus muscle first (helpers if it has none), at most 2 per muscle, 3 in all.
function pickResistance(focus) {
  const chosen = [];
  focus.forEach((id) => {
    const resistance = EXERCISES.filter((e) => e.kind === 'resistance' && !chosen.includes(e));
    const main = resistance.filter((e) => e.trains[id] === 1);
    const pool = main.length ? main : resistance.filter((e) => e.trains[id]);
    pool.slice(0, 2).forEach((e) => {
      if (chosen.length < 3) chosen.push(e);
    });
  });
  return chosen;
}

function pickCardio(focus) {
  const cardio = EXERCISES.filter((e) => e.kind === 'cardio');
  return cardio.find((e) => focus.some((id) => e.trains[id] === 1)) || cardio.find((e) => e.id === 'cevisIntervals');
}

function nameList(ids) {
  const names = ids.map((id) => muscleById(id).name.toLowerCase());
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// When the cycle lowered a full session, the energy chip says only "rested" and the cycle chip says why.
function energyText(energy, cycleChanged) {
  const words = { full: 'full session', lighter: 'lighter today', light: 'light day' };
  if (!energy || !energy.level) return 'Energy: no check-in yet · lighter today';
  const feel = { rested: 'rested', tired: 'tired', veryTired: 'very tired' }[energy.level];
  const base = cycleChanged ? `Energy: ${feel}` : `Energy: ${feel} · ${words[LEVEL_OF_ENERGY[energy.level]]}`;
  return energy.isToday ? base : `${base} · from your last check-in`;
}

/**
 * strength: { muscleId: 0-100 } from the twin
 * energy:   energyLevel() result, or null
 * cycle:    cycleAdjustment() result, or null
 * Returns { focus, level: 'full' | 'lighter' | 'light', exercises, totalMinutes, reasons }.
 * exercises: [{ key, exerciseId (null for mobility), name, dose, detail, minutes, plan }]
 *   plan: { type: 'reps', sets, reps } | { type: 'intervals', sets, seconds, restSeconds } | { type: 'timed', seconds }
 * reasons:   [{ kind: 'focus' | 'energy' | 'cycle', text }], at most 3
 */
export function todaysWorkout({ strength, energy, cycle }) {
  const focus = focusMuscles(strength);
  const energyBased = (energy && LEVEL_OF_ENERGY[energy.level]) || 'lighter';
  const cycleChanged = Boolean(cycle && cycle.adjust) && energyBased === 'full';
  const level = cycleChanged ? 'lighter' : energyBased;

  let exercises;
  if (level === 'light') {
    exercises = [
      {
        key: 'mobility',
        exerciseId: null,
        name: 'Mobility and stretching',
        dose: '10 min',
        detail: 'gentle, at your own pace',
        minutes: 10,
        plan: { type: 'timed', seconds: 600 },
      },
      {
        key: 'cevisEasy',
        exerciseId: 'cevisIntervals',
        name: 'CEVIS cycle, easy',
        dose: '20 min',
        detail: 'easy, steady pace',
        minutes: 20,
        plan: { type: 'timed', seconds: 1200 },
      },
    ];
  } else {
    const sets = level === 'full' ? 4 : 3;
    exercises = pickResistance(focus).map((e) => ({
      key: e.id,
      exerciseId: e.id,
      name: e.name,
      dose: `${sets} × ${repsOf(e.sets)}`,
      detail: level === 'full' ? 'last set near max effort' : 'no max set',
      minutes: sets * MINUTES_PER_SET,
      plan: { type: 'reps', sets, reps: Number(repsOf(e.sets)) || 8 },
    }));
    const c = pickCardio(focus);
    const intervals = c && level === 'full' ? parseIntervals(c.sets) : null;
    if (c && intervals) {
      exercises.push({
        key: c.id,
        exerciseId: c.id,
        name: c.name,
        dose: c.sets,
        detail: 'intervals',
        minutes: INTERVAL_MINUTES[c.id] || STEADY_MINUTES,
        plan: { type: 'intervals', ...intervals, restSeconds: INTERVAL_REST_SECONDS[c.id] || 60 },
      });
    } else if (c) {
      exercises.push({
        key: c.id,
        exerciseId: c.id,
        name: STEADY_NAMES[c.id] || c.name,
        dose: `${STEADY_MINUTES} min`,
        detail: 'steady pace',
        minutes: STEADY_MINUTES,
        plan: { type: 'timed', seconds: STEADY_MINUTES * 60 },
      });
    }
  }

  const reasons = [{ kind: 'focus', text: `Focus: ${nameList(focus)}` }, { kind: 'energy', text: energyText(energy, cycleChanged) }];
  if (cycleChanged) reasons.push({ kind: 'cycle', text: `Cycle day ${cycle.day} · no max sets` });

  return {
    focus,
    level,
    exercises,
    totalMinutes: exercises.reduce((sum, e) => sum + e.minutes, 0),
    reasons,
  };
}
