// Muscle digital twin model (owner: Layal). Data and pure rules only, no UI.
//
// PROTOTYPE MODEL, not measured data. The numbers below are a simple teaching model for the hackathon,
// not a medical measurement. Later steps (weekly plan, "if you keep this up", scans, trainer mode,
// crew points race) reuse these pure functions and the saved shape, so keep them side-effect free.
//
// Sources:
// - NASA Human Research Program: astronauts show average strength and aerobic losses of 10-12% on
//   long missions. DAILY_KEEP is tuned so an untrained muscle loses about 11% over 6 months (180 days).
// - NASA SPRINT study: high-intensity resistance training on ARED plus interval training on the CEVIS cycle
//   and the T2 treadmill with a harness (8 x 30 s, 6 x 2 min or 4 x 4 min intervals).
// - European Space Agency (ESA): ARED squats, deadlifts, heel raises, biceps curls and bench press.
// - Canadian Space Agency (CSA): the exercise bike, the treadmill with a harness, and the Orion flywheel
//   device (rows, squats and deadlifts).
// Only exercises named by these sources are listed. Shoulders have no exercise of their own; they are
// trained as a helper muscle by the bench press and the flywheel row.
// PROTOTYPE ASSUMPTION: the Mars transit ship carries ISS-style exercise devices (ARED, a CEVIS-style bike,
// a T2-style treadmill with a harness) plus the Orion flywheel.
// Starting strengths are set slightly low to match data/today.json (workouts at 68% of plan).
// Legs and back start lowest: the muscles that hold you up against gravity lose the most in space.

import { daysBetween, isIsoDate } from './storage.js';

export const DAILY_KEEP = 0.99935; // 0.99935^180 ≈ 0.889, an 11% loss over 180 days untrained
export const RESTORE_MAIN = 3; // points added to each main muscle per completed workout
export const RESTORE_HELPER = 1.5; // points added to each helper muscle
export const MAX_STRENGTH = 100;
export const MAX_WORKOUTS = 500; // keep the saved list small on the phone

export const MUSCLES = [
  { id: 'shoulders', name: 'Shoulders', start: 74 },
  { id: 'chest', name: 'Chest', start: 76 },
  { id: 'arms', name: 'Arms', start: 72 },
  { id: 'back', name: 'Back', start: 66 },
  { id: 'core', name: 'Core', start: 70 },
  { id: 'glutes', name: 'Glutes', start: 64 },
  { id: 'thighs', name: 'Thighs', start: 62 },
  { id: 'calves', name: 'Calves', start: 58 },
];

// kind: resistance or cardio (used by todaysWorkout.js). trains: 1 = main muscle, 0.5 = helper muscle.
export const EXERCISES = [
  {
    id: 'aredSquat',
    kind: 'resistance',
    name: 'ARED squat',
    sets: '3 × 8',
    how: 'Bar on your shoulders, feet under the bar. Sit back and down, then stand tall.',
    trains: { thighs: 1, glutes: 1, core: 0.5, back: 0.5 },
  },
  {
    id: 'aredDeadlift',
    kind: 'resistance',
    name: 'ARED deadlift',
    sets: '3 × 8',
    how: 'Hinge at the hips with a flat back, lift the bar to standing, then lower it slowly.',
    trains: { back: 1, glutes: 1, thighs: 0.5, core: 0.5 },
  },
  {
    id: 'aredHeelRaise',
    kind: 'resistance',
    name: 'ARED heel raise',
    sets: '3 × 12',
    how: 'Bar on your shoulders, rise onto the balls of your feet, pause, then lower slowly.',
    trains: { calves: 1 },
  },
  {
    id: 'aredBenchPress',
    kind: 'resistance',
    name: 'ARED bench press',
    sets: '3 × 8',
    how: 'Lie on the bench, lower the bar to your chest, then press it straight up.',
    trains: { chest: 1, arms: 0.5, shoulders: 0.5 },
  },
  {
    id: 'aredBicepsCurl',
    kind: 'resistance',
    name: 'ARED biceps curl',
    sets: '3 × 10',
    how: 'Elbows at your sides, curl the bar up to your shoulders, then lower it slowly.',
    trains: { arms: 1 },
  },
  {
    id: 'flywheelRow',
    kind: 'resistance',
    name: 'Flywheel row (Orion)',
    sets: '3 × 10',
    how: 'Feet braced, pull the handle to your ribs, then let it return under control.',
    trains: { back: 1, arms: 1, shoulders: 0.5 },
  },
  {
    id: 'flywheelSquat',
    kind: 'resistance',
    name: 'Flywheel squat (Orion)',
    sets: '3 × 10',
    how: 'Strapped in, squat down against the spinning flywheel, then drive up.',
    trains: { thighs: 1, glutes: 1, calves: 0.5 },
  },
  {
    id: 'cevisIntervals',
    kind: 'cardio',
    name: 'CEVIS cycle intervals',
    sets: '4 × 4 min',
    how: 'Clipped in to the cycle, ride 4 hard minutes, then pedal easy to recover.',
    trains: { thighs: 1, glutes: 0.5, calves: 0.5 },
  },
  {
    id: 'treadmillIntervals',
    kind: 'cardio',
    name: 'T2 treadmill intervals, with harness',
    sets: '8 × 30 s',
    how: 'Harness clipped to the treadmill, run hard for 30 seconds, then walk to recover.',
    trains: { calves: 1, thighs: 1, core: 0.5, glutes: 0.5 },
  },
];

export const STATUS = {
  strong: { word: 'Strong', token: '--stable' },
  watch: { word: 'Watch', token: '--watch' },
  weak: { word: 'Weak', token: '--watch' }, // no red: red means danger only; the word carries the meaning
};

export function statusOf(strength) {
  const v = Math.round(strength);
  if (v >= 75) return 'strong';
  if (v >= 60) return 'watch';
  return 'weak';
}

export function muscleById(id) {
  return MUSCLES.find((m) => m.id === id);
}

export function exerciseById(id) {
  return EXERCISES.find((e) => e.id === id);
}

// The 2-3 best exercises for one muscle: main ones first, then helpers, in list order.
export function exercisesFor(muscleId) {
  const main = EXERCISES.filter((e) => e.trains[muscleId] === 1);
  const helpers = EXERCISES.filter((e) => e.trains[muscleId] && e.trains[muscleId] < 1);
  return [...main, ...helpers].slice(0, 3);
}

function clamp(v) {
  return Math.min(MAX_STRENGTH, Math.max(0, v));
}

// The sample model, used when nothing is saved yet.
export function freshState(today) {
  return {
    version: 1,
    updatedOn: today,
    strength: Object.fromEntries(MUSCLES.map((m) => [m.id, m.start])),
    workouts: [],
  };
}

// Saved JSON (or nothing) -> a complete, valid state. Returns null when nothing usable is saved.
export function normalize(saved, today) {
  if (!saved || typeof saved !== 'object' || !saved.strength) return null;
  const strength = {};
  MUSCLES.forEach((m) => {
    const v = Number(saved.strength[m.id]);
    strength[m.id] = Number.isFinite(v) ? clamp(v) : m.start;
  });
  const updatedOn = isIsoDate(saved.updatedOn) && daysBetween(saved.updatedOn, today) >= 0 ? saved.updatedOn : today;
  const workouts = (Array.isArray(saved.workouts) ? saved.workouts : [])
    .filter((w) => w && exerciseById(w.exerciseId) && isIsoDate(w.date))
    .map((w) => ({
      exerciseId: w.exerciseId,
      date: w.date,
      at: typeof w.at === 'string' ? w.at : `${w.date}T00:00:00.000Z`,
      ...(LEVELS.includes(w.level) ? { level: w.level } : {}),
      ...(w.source === 'twin' ? { source: 'twin' } : {}),
    }))
    .slice(0, MAX_WORKOUTS);
  return { version: 1, updatedOn, strength, workouts };
}

// The daily drop for every day since updatedOn. Same state back if no day has passed.
export function applyDrop(state, today) {
  const days = daysBetween(state.updatedOn, today);
  if (days <= 0) return state;
  const keep = DAILY_KEEP ** days;
  const strength = Object.fromEntries(MUSCLES.map((m) => [m.id, clamp(state.strength[m.id] * keep)]));
  return { ...state, updatedOn: today, strength };
}

// Workout levels from todaysWorkout.js. Every level restores the same amount (points race counts them equally).
export const LEVELS = ['full', 'lighter', 'light'];

// A completed workout: drop up to today first, then restore the muscles it trains.
// extra: optional { level, source: 'twin' } saved with the entry (workout mode).
// Returns the new state and the main muscles that grew (for the "Saved" line).
export function completeWorkout(state, exerciseId, today, now = new Date(), extra = {}) {
  const exercise = exerciseById(exerciseId);
  if (!exercise) return { state, grown: [] };
  const base = applyDrop(state, today);
  const strength = { ...base.strength };
  Object.entries(exercise.trains).forEach(([id, weight]) => {
    strength[id] = clamp(strength[id] + (weight === 1 ? RESTORE_MAIN : RESTORE_HELPER));
  });
  const entry = { exerciseId, date: today, at: now.toISOString() };
  if (LEVELS.includes(extra.level)) entry.level = extra.level;
  if (extra.source === 'twin') entry.source = 'twin';
  const workouts = [entry, ...base.workouts].slice(0, MAX_WORKOUTS);
  const grown = MUSCLES.filter((m) => exercise.trains[m.id] === 1).map((m) => m.id);
  return { state: { ...base, strength, workouts }, grown };
}
