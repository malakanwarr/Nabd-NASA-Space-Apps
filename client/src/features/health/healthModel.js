// Health profile model (owner: Habiba). Plain functions: no React, no fetching.
//
// There is NO single score on purpose. Four separate views (cognitive readiness, physical readiness,
// sleep recovery, emotional wellbeing), each compared with the astronaut's own baseline.
// Every value carries a source: measured (on this phone), self (self-reported), estimated, simulated (sample data).
//
// The thresholds below are prototype values chosen by our team. They are NOT clinically validated.

export const SOURCE = {
  measured: 'Measured on this phone',
  self: 'Self-reported',
  sensor: 'Heart sensor',
  estimated: 'Estimated',
  simulated: 'Simulated demo data',
};

// Sara's baseline has no loudness, so we use the value from her first sample day (same as the energy score).
export const BASELINE_LOUDNESS = 0.06;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function mean(list) {
  const xs = list.filter(isNum);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

// Population standard deviation.
export function sd(list) {
  const xs = list.filter(isNum);
  if (xs.length < 2) return null;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length);
}

// Pearson correlation of two lists of the same length. null when it cannot be worked out.
export function pearson(xs, ys) {
  if (xs.length !== ys.length || xs.length < 3) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i] - my);
    dx += (x - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  });
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

// ---------- One number compared with the baseline ----------

// How much worse than baseline, as a share (0.2 = 20% worse). dir 'up': bigger is worse. dir 'down': smaller is worse.
function worseBy(value, base, dir) {
  const change = (value - base) / base;
  return dir === 'up' ? change : -change;
}

function judge(worse, watchAt, actAt) {
  if (worse >= actAt) return 'act';
  if (worse >= watchAt) return 'watch';
  return 'stable';
}

export function makeSignal({ id, label, value, baseline, unit = '', dir, watchAt, actAt, source, digits = 0 }) {
  if (!isNum(value) || !isNum(baseline) || baseline === 0) return null;
  const worse = worseBy(value, baseline, dir);
  return {
    id,
    label,
    value,
    baseline,
    unit,
    digits,
    status: judge(worse, watchAt, actAt),
    share: clamp(worse / actAt, 0, 1.5), // 0 = like your normal, 1 = well outside it
    changePct: Math.round(((value - baseline) / baseline) * 100),
    source,
  };
}

// A count that is bad when high (for example lapses, short nights in a row).
function countSignal({ id, label, value, baseline, unit, watchAt, actAt, source }) {
  if (!isNum(value)) return null;
  const over = value - baseline;
  return {
    id,
    label,
    value,
    baseline,
    unit,
    digits: 0,
    status: over >= actAt ? 'act' : over >= watchAt ? 'watch' : 'stable',
    share: clamp(over / actAt, 0, 1.5),
    changePct: null,
    source,
  };
}

export function formatValue(signal) {
  const v = signal.digits ? signal.value.toFixed(signal.digits) : Math.round(signal.value);
  return `${v}${signal.unit}`;
}

export function formatBaseline(signal) {
  const v = signal.digits ? signal.baseline.toFixed(signal.digits) : Math.round(signal.baseline);
  return `${v}${signal.unit}`;
}

// ---------- A dimension: its signals, one status in words, and how sure we are ----------

const STATUS_WORDS = {
  stable: 'In your normal range',
  watch: 'Different from your normal',
  act: 'Well outside your normal',
  unknown: 'Not enough data yet',
};

// A dimension's score, 0 to 100: 100 is exactly your normal. The worst signal counts most, so one bad number is not hidden.
export function scoreFromShares(shares) {
  if (!shares.length) return null;
  const worst = Math.max(...shares);
  const average = shares.reduce((a, b) => a + b, 0) / shares.length;
  return clamp(Math.round(100 - 50 * (0.6 * worst + 0.4 * average)), 0, 100);
}

// 80 and over is stable, 60 to 79 is watch, below 60 is act.
export const statusFromScore = (score) => (score >= 80 ? 'stable' : score >= 60 ? 'watch' : 'act');

function summarise(signals, expected) {
  const present = signals.filter(Boolean);
  if (!present.length) {
    return { status: 'unknown', score: null, words: STATUS_WORDS.unknown, confidence: 'Low', present: 0, expected, off: [], worst: null };
  }
  const off = present.filter((s) => s.status !== 'stable');
  const score = scoreFromShares(present.map((s) => s.share ?? 0));
  const status = statusFromScore(score);
  const share = present.length / expected;
  const worst = [...present].sort((a, b) => (b.share ?? 0) - (a.share ?? 0))[0];
  return {
    status,
    score,
    worst,
    words: STATUS_WORDS[status],
    confidence: share >= 0.75 ? 'High' : share >= 0.5 ? 'Medium' : 'Low',
    present: present.length,
    expected,
    off: off.map((s) => s.label.toLowerCase()),
  };
}

function latestBy(list, key) {
  return list.filter((x) => isNum(x[key])).slice(-1)[0] ?? null;
}

// ---------- Sleep nights (history + self-reported answers), shared by the hub and the sleep page ----------

// Small fixed offsets (minutes) used to make the simulated wake-up times look like real days.
const WAKE_JITTER = [0, 12, -8, 20, 5, -15, 25, 0, 18, -10, 30, 10, -5, 22];

export function fmtClock(minutes) {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function parseClock(text) {
  const [h, m] = String(text).split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

// Bedtime is stored as minutes after 18:00, so a night that crosses midnight stays in one piece.
export const bedLabel = (bedMin) => fmtClock(bedMin + 18 * 60);

export function sleepNights(history, entries, baselineHours) {
  const nights = history.map((day, i) => {
    const wakeMin = 7 * 60 + WAKE_JITTER[i % WAKE_JITTER.length];
    const bedAbs = wakeMin - Math.round(day.sleepHours * 60) - 20;
    return {
      missionDay: day.missionDay,
      date: day.date,
      hours: day.sleepHours,
      reactionMs: day.reactionTimeMs,
      wakeMin,
      bedMin: (((bedAbs - 18 * 60) % 1440) + 1440) % 1440,
      quality: clamp(Math.round(1 + (4 * (day.sleepHours - 4)) / (baselineHours - 4)), 1, 5),
      source: 'simulated',
    };
  });
  entries.forEach((entry) => {
    const bed = parseClock(entry.bed);
    const wake = parseClock(entry.wake);
    if (bed === null || wake === null) return;
    const hours = Math.round((((wake - bed + 1440) % 1440) / 60) * 10) / 10;
    const night = {
      missionDay: entry.missionDay,
      date: entry.date,
      hours,
      wakeMin: wake,
      bedMin: (((bed - 18 * 60) % 1440) + 1440) % 1440,
      quality: entry.quality,
      rested: entry.rested,
      interruptions: entry.interruptions,
      fallAsleep: entry.fallAsleep,
      source: 'self',
    };
    const at = nights.findIndex((n) => n.missionDay === entry.missionDay);
    if (at >= 0) nights[at] = night;
    else nights.push(night);
  });
  return nights.sort((a, b) => a.missionDay - b.missionDay);
}

// Nights in a row, ending on `day`, with less than 6.5 hours of sleep. Counts the astronaut's own answers too,
// so one good night she reports breaks the run. null when that day has no night.
export function shortNightStreak(nights, day) {
  const at = nights.findIndex((n) => n.missionDay === day);
  if (at < 0) return null;
  let streak = 0;
  for (let i = at; i >= 0 && nights[i].hours < 6.5; i -= 1) streak += 1;
  return streak;
}

// How regular the last nights were: spread of bedtime and wake-up time, in minutes.
export function regularity(nights, last = 7) {
  const recent = nights.slice(-last);
  const bed = sd(recent.map((n) => n.bedMin));
  const wake = sd(recent.map((n) => n.wakeMin));
  if (bed === null || wake === null) return null;
  const worst = Math.max(bed, wake);
  return {
    bedSd: Math.round(bed),
    wakeSd: Math.round(wake),
    label: worst <= 30 ? 'Regular' : worst <= 60 ? 'Somewhat irregular' : 'Irregular',
    status: worst <= 30 ? 'stable' : worst <= 60 ? 'watch' : 'act',
  };
}

// Sleep length against reaction time. Uses the sample history only, so every point has the same source.
export function sleepVsReaction(nights) {
  const pairs = nights
    .filter((n) => n.source === 'simulated' && isNum(n.reactionMs))
    .map((n) => ({ hours: n.hours, ms: n.reactionMs, missionDay: n.missionDay }));
  const r = pearson(pairs.map((p) => p.hours), pairs.map((p) => p.ms));
  const short = pairs.filter((p) => p.hours < 6.5);
  const normal = pairs.filter((p) => p.hours >= 6.5);
  return {
    pairs,
    r,
    n: pairs.length,
    shortAvg: short.length >= 2 ? Math.round(mean(short.map((p) => p.ms))) : null,
    normalAvg: normal.length >= 2 ? Math.round(mean(normal.map((p) => p.ms))) : null,
    shortCount: short.length,
    normalCount: normal.length,
  };
}

export function describeCorrelation(r, n) {
  if (r === null || n < 5) return 'There is not enough data yet to see a pattern.';
  if (r <= -0.5) return `On shorter nights, reaction times tended to be slower (r = ${r.toFixed(2)}, ${n} days).`;
  if (r <= -0.3) return `There is a weak pattern: shorter nights and slower reactions sometimes went together (r = ${r.toFixed(2)}, ${n} days).`;
  return `We do not see a clear pattern between sleep length and reaction time (r = ${r.toFixed(2)}, ${n} days).`;
}

// ---------- The four dimensions ----------

export function buildProfile({ today, baseline, history, reactionTests, checkins, sleepEntries = [] }) {
  const mood = baseline.mood || {};
  const latest = [...checkins].sort((a, b) => a.missionDay - b.missionDay).slice(-1)[0] || null;
  const face = latest?.face || {};
  const voice = latest?.voice || {};
  const checkinIsToday = latest && latest.missionDay === today.missionDay;

  // ----- Cognitive readiness: reaction time and its lapses, speech pace and pauses, blinks and eyelids -----
  const lastHistoryReaction = latestBy(history, 'reactionTimeMs');
  const reactionMs = isNum(latest?.reactionMs) ? latest.reactionMs : lastHistoryReaction?.reactionTimeMs;
  const reactionSource = isNum(latest?.reactionMs) ? 'measured' : 'simulated';
  const recent = (reactionTests?.recent || []).filter((r) => isNum(r.lapses));
  const lastTest = recent.slice(-1)[0];
  const usualLapses = mean(recent.slice(0, -1).map((r) => r.lapses)) ?? 0;

  const cognitiveSignals = [
    makeSignal({ id: 'reaction', label: 'Reaction time', value: reactionMs, baseline: baseline.reactionTimeMs, unit: ' ms', dir: 'up', watchAt: 0.12, actAt: 0.3, source: reactionSource }),
    countSignal({ id: 'lapses', label: 'Reaction lapses', value: lastTest?.lapses, baseline: Math.round(usualLapses), unit: '', watchAt: 1, actAt: 2, source: 'simulated' }),
    makeSignal({ id: 'pace', label: 'Speaking pace', value: voice.paceSegmentsPerSec, baseline: mood.paceSegmentsPerSec, unit: ' /s', dir: 'down', watchAt: 0.1, actAt: 0.25, source: 'measured', digits: 1 }),
    makeSignal({ id: 'pauses', label: 'Pauses', value: voice.pauseRatio, baseline: mood.pauseRatio, unit: '', dir: 'up', watchAt: 0.15, actAt: 0.35, source: 'measured', digits: 2 }),
    makeSignal({ id: 'blinks', label: 'Blink rate', value: face.blinksPerMin, baseline: mood.blinksPerMin, unit: ' /min', dir: 'up', watchAt: 0.2, actAt: 0.4, source: 'measured' }),
    makeSignal({ id: 'eyelids', label: 'Eyelid opening', value: face.eyeOpenness, baseline: mood.eyeOpenness, unit: '', dir: 'down', watchAt: 0.05, actAt: 0.12, source: 'measured', digits: 2 }),
  ];

  // ----- Physical readiness: heart rate, blood pressure, exercise -----
  const vitals = today.vitals || {};
  const bp = vitals.bloodPressure;
  const bpBase = baseline.bloodPressure;
  const bpSignal = bp && bpBase && makeSignal({ id: 'bp', label: 'Blood pressure', value: bp.systolic, baseline: bpBase.systolic, unit: '', dir: 'up', watchAt: 0.08, actAt: 0.15, source: 'simulated' });
  const physicalSignals = [
    makeSignal({ id: 'hr', label: 'Resting heart rate', value: vitals.heartRateBpm, baseline: baseline.restingHeartRateBpm, unit: ' bpm', dir: 'up', watchAt: 0.08, actAt: 0.15, source: 'simulated' }),
    bpSignal && { ...bpSignal, displayValue: `${bp.systolic}/${bp.diastolic}`, displayBaseline: `${bpBase.systolic}/${bpBase.diastolic}` },
    makeSignal({ id: 'exercise', label: 'Exercise this week', value: today.workoutsThisWeek?.percent, baseline: 100, unit: '% of plan', dir: 'down', watchAt: 0.15, actAt: 0.4, source: 'simulated' }),
  ];

  // ----- Sleep recovery -----
  const nights = sleepNights(history, sleepEntries, baseline.sleepHours);
  const reg = regularity(nights);
  const todayNight = nights.find((n) => n.missionDay === today.missionDay);
  const sleepSignals = [
    makeSignal({ id: 'duration', label: 'Sleep last night', value: todayNight?.hours ?? today.sleepLastNightHours, baseline: baseline.sleepHours, unit: ' h', dir: 'down', watchAt: 0.1, actAt: 0.2, source: todayNight?.source === 'self' ? 'self' : 'simulated', digits: 1 }),
    countSignal({ id: 'short', label: 'Short nights in a row', value: shortNightStreak(nights, today.missionDay) ?? today.sleepShortNightsInARow, baseline: 0, unit: '', watchAt: 3, actAt: 5, source: 'simulated' }),
    reg && { id: 'regular', label: 'Sleep regularity', value: reg.bedSd, baseline: 30, unit: ' min', digits: 0, status: reg.status, share: clamp((reg.bedSd - 30) / 60, 0, 1.5), changePct: null, source: 'estimated', words: reg.label },
    todayNight?.source === 'self' && isNum(todayNight.quality) &&
      makeSignal({ id: 'quality', label: 'Sleep quality', value: todayNight.quality, baseline: 4, unit: ' of 5', dir: 'down', watchAt: 0.2, actAt: 0.4, source: 'self' }),
  ];

  // ----- Emotional wellbeing: smile and voice from the daily check-in (an estimate, not a mood diagnosis) -----
  const emotionalSignals = [
    makeSignal({ id: 'smile', label: 'Smile rate', value: face.smileRate, baseline: mood.smileRate, unit: '', dir: 'down', watchAt: 0.2, actAt: 0.4, source: 'estimated', digits: 2 }),
    makeSignal({ id: 'pitch', label: 'Voice pitch range', value: voice.pitchRangeHz, baseline: mood.pitchRangeHz, unit: ' Hz', dir: 'down', watchAt: 0.15, actAt: 0.3, source: 'estimated' }),
    makeSignal({ id: 'loudness', label: 'Voice loudness', value: voice.loudness, baseline: mood.loudness ?? BASELINE_LOUDNESS, unit: '', dir: 'down', watchAt: 0.15, actAt: 0.3, source: 'estimated', digits: 3 }),
  ];

  const series = {
    cognitive: {
      label: 'Reaction time (ms)',
      baseline: baseline.reactionTimeMs,
      points: [
        ...history.filter((d) => isNum(d.reactionTimeMs)).map((d) => ({ x: d.missionDay, y: d.reactionTimeMs, source: 'simulated' })),
        ...checkins.filter((c) => isNum(c.reactionMs)).map((c) => ({ x: c.missionDay, y: c.reactionMs, source: 'measured' })),
      ].sort((a, b) => a.x - b.x),
    },
    physical: {
      label: 'Resting heart rate (bpm)',
      baseline: baseline.restingHeartRateBpm,
      points: history.filter((d) => isNum(d.restingHeartRateBpm)).map((d) => ({ x: d.missionDay, y: d.restingHeartRateBpm, source: 'simulated' })),
    },
    sleep: {
      label: 'Sleep (hours)',
      baseline: baseline.sleepHours,
      points: nights.map((n) => ({ x: n.missionDay, y: n.hours, source: n.source })),
    },
  };
  const smilePoints = checkins.filter((c) => isNum(c.face?.smileRate)).map((c) => ({ x: c.missionDay, y: c.face.smileRate, source: 'estimated' }));
  series.emotional =
    smilePoints.length >= 3
      ? { label: 'Smile rate', baseline: mood.smileRate, points: smilePoints }
      : {
          label: 'Voice pitch range (Hz)',
          baseline: mood.pitchRangeHz,
          points: checkins.filter((c) => isNum(c.voice?.pitchRangeHz)).map((c) => ({ x: c.missionDay, y: c.voice.pitchRangeHz, source: 'estimated' })),
        };

  const asOfCheckin = latest ? `Day ${latest.missionDay}` : null;
  const make = (id, title, signals, expected, extra) => ({
    id,
    title,
    signals: signals.filter(Boolean),
    ...summarise(signals, expected),
    series: series[id],
    ...extra,
  });

  return {
    missionDay: today.missionDay,
    checkinIsToday: Boolean(checkinIsToday),
    nights,
    dimensions: [
      make('cognitive', 'Cognitive readiness', cognitiveSignals, 6, {
        asOf: asOfCheckin ? `Check-in ${asOfCheckin}` : 'No check-in yet',
        note: 'Reaction time is measured in the Pollen catch game. Voice and face numbers come from the daily check-in.',
        href: '/checkin/results',
        linkLabel: 'See check-in details',
      }),
      make('physical', 'Physical readiness', physicalSignals, 3, {
        asOf: `Day ${today.missionDay}`,
        note: 'Heart rate, blood pressure and exercise this week.',
        href: '/health/cardio',
        linkLabel: 'Open heart and fluid health',
      }),
      make('sleep', 'Sleep recovery', sleepSignals, 4, {
        asOf: `Day ${today.missionDay}`,
        note: 'Answer the morning questions on the sleep screen to add your own sleep times.',
        href: '/health/sleep',
        linkLabel: 'Open sleep and recovery',
      }),
      make('emotional', 'Emotional wellbeing', emotionalSignals, 3, {
        asOf: asOfCheckin ? `Check-in ${asOfCheckin}` : 'No check-in yet',
        note: 'Estimated from your smile and your voice. It shows how expressive you were, not what you feel.',
        href: '/checkin/results',
        linkLabel: 'See check-in details',
        forcedSources: ['estimated'],
      }),
    ],
  };
}

// ---------- The four scores for one mission day (used after the check-in, and for the 7-day chart) ----------

// What "today" looks like for a day in the past: built from that day's row in history-14-days.
export function dayContext({ day, today, history }) {
  if (day === today.missionDay) return today;
  const at = history.findIndex((h) => h.missionDay === day);
  if (at < 0) return null;
  const row = history[at];
  let streak = 0;
  for (let i = at; i >= 0 && history[i].sleepHours < 6.5; i -= 1) streak += 1;
  return {
    missionDay: day,
    date: row.date,
    vitals: { heartRateBpm: row.restingHeartRateBpm, bloodPressure: row.bloodPressure },
    sleepLastNightHours: row.sleepHours,
    sleepShortNightsInARow: streak,
    workoutsThisWeek: null, // only today's weekly total is known
  };
}

// checkin: that day's check-in (face, voice, reactionMs) or null. Returns the four dimensions with a score each.
export function scoresForDay({ day, today, baseline, history, reactionTests, checkin, sleepEntries = [] }) {
  const context = dayContext({ day, today, history });
  if (!context) return null;
  const upTo = history.filter((h) => h.missionDay <= day);
  const tests = reactionTests ? { ...reactionTests, recent: (reactionTests.recent || []).filter((r) => r.missionDay <= day) } : null;
  const profile = buildProfile({
    today: context,
    baseline,
    history: upTo,
    reactionTests: tests,
    checkins: checkin ? [{ ...checkin, missionDay: day }] : [],
    sleepEntries: sleepEntries.filter((e) => e.missionDay <= day),
  });
  return profile.dimensions;
}
