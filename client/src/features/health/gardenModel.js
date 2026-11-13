// Habitat garden logic (owner: Habiba). Plain functions: no React, no fetching.
//
// 1. Her own plants follow her real habits and scores, and droop when one runs low (private: only she sees them).
// 2. The crew tree follows the crew as a whole, from totals only. It never shows a name or one person's numbers.
import { clamp, scoresForDay, sleepNights } from './healthModel.js';

export const WILT_BELOW = 60; // a plant under this percent droops
export const CREW_TREE_WILT_BELOW = 75; // the crew tree droops when the crew average is under this
export const MIN_CREW = 3; // with fewer people than this, totals would point at one person, so nothing is shown

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const pct = (value, target) => (isNum(value) && isNum(target) && target > 0 ? clamp(Math.round((value / target) * 100), 0, 100) : null);

// The five plants, from today's real numbers. samplePlants (the sample file) fills in anything we cannot work out.
export function livePlants({ today, baseline, history, reactionTests, checkin, sleepEntries = [], samplePlants }) {
  const sample = Object.fromEntries(samplePlants.map((p) => [p.name, p]));
  const nights = sleepNights(history, sleepEntries, baseline.sleepHours);
  const night = nights.find((n) => n.missionDay === today.missionDay);
  const hours = night?.hours ?? today.sleepLastNightHours;

  const dims = scoresForDay({ day: today.missionDay, today, baseline, history, reactionTests, checkin: checkin ?? null, sleepEntries }) ?? [];
  const mood = checkin ? dims.find((d) => d.id === 'emotional') : null;
  const sleepScore = dims.find((d) => d.id === 'sleep')?.score;
  // The Sleep plant follows the lower of the hours and the sleep score, so the garden tells the same story as the scores.
  const sleepPercent = pct(hours, baseline.sleepHours);
  const sleepShown = sleepPercent === null ? null : isNum(sleepScore) ? Math.min(sleepPercent, sleepScore) : sleepPercent;

  const make = (name, percent, detail) => (percent === null ? sample[name] : { name, percent, detail });
  return [
    make('Sleep', sleepShown, `${Number(hours).toFixed(1)} of ${baseline.sleepHours} h`),
    make('Water', pct(today.waterTodayLiters, today.waterTargetLiters), `${today.waterTodayLiters} of ${today.waterTargetLiters} L`),
    make('Exercise', isNum(today.workoutsThisWeek?.percent) ? clamp(today.workoutsThisWeek.percent, 0, 100) : null, `${today.workoutsThisWeek?.hoursDone} of ${today.workoutsThisWeek?.hoursPlanned} h`),
    make('Vitamin D', pct(today.vitaminDThisWeek?.taken, today.vitaminDThisWeek?.planned), `${today.vitaminDThisWeek?.taken} of ${today.vitaminDThisWeek?.planned} doses`),
    mood && mood.score !== null ? { name: 'Mood', percent: mood.score, detail: 'from your voice and smile' } : sample.Mood,
  ].filter(Boolean);
}

export const isWilting = (percent) => percent < WILT_BELOW;

// How far a plant leans (degrees): 0 when healthy, up to about 22 when it is very low.
export function droopAngle(percent) {
  return isWilting(percent) ? Math.round(((WILT_BELOW - clamp(percent, 0, WILT_BELOW)) / WILT_BELOW) * 22) : 0;
}

// One gentle message about the plant that needs the most care, or null when all are fine. Never a diagnosis.
export function careNote(plants) {
  const needy = plants.filter((p) => isWilting(p.percent)).sort((a, b) => a.percent - b.percent)[0];
  if (!needy) return null;
  const notes = {
    Sleep: { text: 'Your Sleep plant is drooping after short nights. A lighter day and an early night give it time to recover.', to: '/health/sleep', label: 'See your sleep' },
    Mood: { text: 'Your Mood plant is drooping. Your last check-in looked and sounded a little flatter than your normal. Home is one tap away.', to: '/family', label: 'Open Family' },
    Exercise: { text: 'Your Exercise plant needs a workout. Your twin has a short one ready.', to: '/body/muscles', label: 'Open today\'s workout' },
    Water: { text: 'Your Water plant is thirsty. A glass now helps it catch up.', to: null, label: null },
    'Vitamin D': { text: 'Your Vitamin D plant is thirsty. Check your doses this week.', to: null, label: null },
  };
  return { plant: needy.name, ...(notes[needy.name] ?? { text: `Your ${needy.name} plant needs care.`, to: null, label: null }) };
}

// The crew tree, from the crew list. Uses only status and readiness. Returns null when the crew is too small to be anonymous.
export function crewTree(crew, sampleTreePercent) {
  const members = (crew || []).filter((m) => isNum(m.readiness));
  if (members.length < MIN_CREW) return null;
  const average = Math.round(members.reduce((a, m) => a + m.readiness, 0) / members.length);
  const low = members.filter((m) => m.status === 'watch' || m.status === 'act').length;
  const share = low / members.length;
  const wilting = average < CREW_TREE_WILT_BELOW || share >= 0.5;
  // One tree per crew member, but with no names and in an order that says nothing about who is who:
  // the healthy trees first, then the ones that need care.
  const trees = members
    .map((m) => ({ percent: clamp(Math.round(m.readiness), 0, 100), wilting: m.status === 'watch' || m.status === 'act' || m.readiness < CREW_TREE_WILT_BELOW }))
    .sort((a, b) => Number(a.wilting) - Number(b.wilting) || b.percent - a.percent);
  const words = share >= 0.5 ? 'Many of the crew are running low.' : share >= 0.25 ? 'Some of the crew are running low.' : 'Most of the crew are doing well.';
  return {
    percent: isNum(average) ? average : sampleTreePercent,
    trees,
    wilting,
    words,
    message: wilting ? `${words} The crew tree needs care. A message or a hug to a crewmate helps it grow back.` : `${words} The crew tree is growing.`,
  };
}
