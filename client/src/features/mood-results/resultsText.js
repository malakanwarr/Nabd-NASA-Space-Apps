// Helpers for the results screen (owner: Malak): the chart points and the words around them.

// How far either side of her baseline still counts as a normal day.
export const NORMAL_SPREAD = 3;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// "Tue" under each point on the chart, or "Today" for the newest day.
export function dayName(date, isToday) {
  if (isToday) return 'Today';
  const day = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(day.getTime()) ? '' : DAYS[day.getUTCDay()];
}

// The check-ins the chart draws, oldest first, with the newest one marked.
export function chartPoints(history, baselineScore) {
  return history.map((c, i) => {
    const last = i === history.length - 1;
    return {
      name: dayName(c.date, last),
      energyScore: c.energyScore,
      newest: last ? c.energyScore : null,
      status: c.energyScore >= baselineScore - NORMAL_SPREAD ? 'stable' : 'watch',
    };
  });
}

// "Energy lower than normal 4 days in a row", counted from today backwards.
export function daysInARow(history) {
  let count = 0;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i].label !== 'tired') break;
    count += 1;
  }
  return count;
}

// The line under the score: how long this has been going on.
export function runLine(label, run) {
  if (run > 1) return `Energy lower than your normal ${run} days in a row`;
  if (label === 'tired') return 'Energy lower than your normal today';
  return 'In your normal range';
}

// One line of advice, built from Sara's own numbers. It never diagnoses anything.
export function advice(label, today, baseline) {
  const sleep = today && today.sleepLastNightHours;
  const nights = (today && today.sleepShortNightsInARow) || 0;
  const normalSleep = baseline && baseline.sleepHours;
  if (label === 'tired' && sleep && normalSleep && sleep < normalSleep) {
    const run = nights > 1 ? ` for ${nights} nights` : '';
    return `This lines up with your short sleep (${sleep} h${run}, against your usual ${normalSleep} h). Rest for 20 minutes after lunch and dim the lights from 21:00.`;
  }
  if (label === 'tired') {
    return 'Take it gently today: a 20-minute rest after lunch and an early, dark evening help most.';
  }
  return 'Today looks like your normal self. Keep your sleep and your workouts where they are.';
}
