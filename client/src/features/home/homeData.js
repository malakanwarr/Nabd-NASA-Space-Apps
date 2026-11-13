// Pure helpers for the Home screen. No numbers of Sara's are typed here: they all arrive as arguments.

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function formatKm(km) {
  return `${Math.round(km / 1e6)} M km`;
}

export function formatDelay({ minutes, seconds }) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(minutes)}:${pad(seconds)}`;
}

// "Ready with caution" -> watch. Anything about rest or not being ready -> act. Otherwise stable.
export function toneFromLabel(label = '') {
  const l = label.toLowerCase();
  if (l.includes('caution')) return 'watch';
  if (l.includes('not') || l.includes('rest') || l.includes('act')) return 'act';
  return 'stable';
}

export function buildAttentionRows({ systems = [], today, baseline }) {
  const details = {
    bones: `Could reach Act in ~6 weeks · workouts at ${today.workoutsThisWeek.percent}%`,
    mind: `${today.sleepShortNightsInARow} short nights · ${today.sleepLastNightHours} h vs your ${baseline.sleepHours} h`,
    kidneys: `${today.waterTodayLiters} of ${today.waterTargetLiters} L water today`,
  };
  return systems
    .filter((sys) => sys.status !== 'stable')
    .map((sys) => ({
      id: sys.id,
      title: sys.name,
      subtitle: details[sys.id] ?? sys.headline,
      status: sys.status,
    }));
}

export function buildForYouRows({ garden, hugs, profile }) {
  const thisWeek = hugs?.thisWeek ?? [];
  // latest = highest mission day; the last one wins on a tie
  const latest = thisWeek.reduce(
    (best, h) => (!best || h.missionDay >= best.missionDay ? h : best),
    null,
  );
  const city = (profile?.hometown || 'Cairo').split(',')[0];

  const rows = [
    { id: 'sugar', title: 'Blood sugar check due', subtitle: '2 min', to: '/measure' },
    {
      id: 'garden',
      title: 'Habitat garden',
      subtitle: `${garden.grownPercent}% grown`,
      to: '/garden',
    },
    { id: 'window', title: 'Home window', subtitle: `7:40 pm in ${city}`, to: '/family' },
  ];
  if (latest) {
    rows.push({
      id: 'hug',
      title: `${latest.from} sent you a hug`,
      subtitle: '2 h ago',
      to: '/family',
    });
  }
  return rows;
}
