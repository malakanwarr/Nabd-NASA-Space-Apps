// Small helpers for the women's health screens (owner: Layal).

// Today's date on the phone as YYYY-MM-DD (local time, not UTC).
export function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// localStorage that never throws (private window, blocked storage). Phone-only conveniences.
export function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage blocked: the choice still works for this visit
  }
}

// "2026-11-13" -> "13 Nov"
export function shortDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function capitalize(text) {
  const t = String(text ?? '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// ---------- Cycle maths (worked out on the phone from the saved logs) ----------

// "days 1–5" -> { start: 1, end: 5 }, "around day 14" -> { start: 14, end: 14 }
export function dayRange(text) {
  const nums = String(text ?? '').match(/\d+/g);
  if (!nums) return null;
  return { start: Number(nums[0]), end: Number(nums[nums.length - 1]) };
}

// Whole days from one YYYY-MM-DD to another (no time zone or daylight-saving surprises).
export function daysBetween(fromIso, toIso) {
  const utc = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(toIso) - utc(fromIso)) / 86400000);
}

export function isPeriodEnded(log) {
  return log.area === 'period' && (log.symptoms || []).includes('period ended');
}

export function isPeriodDay(log) {
  return log.area === 'period' && !isPeriodEnded(log);
}

// A period day starts a new cycle when no other period log is in the 10 days before it.
const NEW_CYCLE_GAP_DAYS = 10;

function latestCycleStart(logs, today) {
  const periodLogDates = logs.filter((l) => l.area === 'period' && l.date <= today).map((l) => l.date);
  const periodDays = [...new Set(logs.filter((l) => isPeriodDay(l) && l.date <= today).map((l) => l.date))].sort();
  const starts = periodDays.filter(
    (d) => !periodLogDates.some((x) => {
      const gap = daysBetween(x, d);
      return gap >= 1 && gap <= NEW_CYCLE_GAP_DAYS;
    }),
  );
  return starts.length ? starts[starts.length - 1] : null;
}

// Average period length of the cycles in womens-health.json, rounded (5 now).
function estimatedPeriodDays(cycle) {
  const lengths = (cycle.cycles || []).map((c) => c.periodDays).filter((n) => Number.isFinite(n) && n > 0);
  if (!lengths.length) return dayRange(cycle.phases.period)?.end || 5;
  return Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
}

// Everything the cycle screen shows. Without period logs it is the sample data, unchanged.
// inDays is null when the cycle has run past its usual length ("may start any day now").
export function computeCycle(cycle, logs, today) {
  const length = cycle.averageCycleLengthDays;
  const todayLogged = logs.some((l) => isPeriodDay(l) && l.date === today);
  const start = latestCycleStart(logs, today);

  if (!start) {
    return {
      day: cycle.todayCycleDay,
      length,
      phases: cycle.phases,
      phaseName: cycle.phaseToday,
      inDays: cycle.nextPeriodExpected.inDays,
      inPeriod: cycle.phaseToday === 'period',
      todayLogged,
    };
  }

  const day = daysBetween(start, today) + 1;
  const estimate = estimatedPeriodDays(cycle);
  const sinceStart = logs.filter((l) => l.area === 'period' && l.date >= start && l.date <= today);
  const lastPeriodDay = sinceStart.filter(isPeriodDay).map((l) => l.date).sort().pop();
  const endedDates = sinceStart.filter(isPeriodEnded).map((l) => l.date).sort();
  // "My period ended" counts only if she has not logged a period day after it.
  const ended = endedDates.length && endedDates[endedDates.length - 1] >= lastPeriodDay ? endedDates[endedDates.length - 1] : null;
  const lastDay = daysBetween(start, lastPeriodDay) + 1;

  let periodEnd;
  let inPeriod;
  if (ended) {
    periodEnd = daysBetween(start, ended) + 1; // ends on the day she tapped "My period ended"
    inPeriod = false;
  } else if (day <= estimate) {
    periodEnd = Math.max(estimate, lastDay); // still within the estimate: the period continues
    inPeriod = true;
  } else {
    periodEnd = lastDay; // estimate passed: it ended on her last logged period day
    inPeriod = day <= lastDay;
  }

  // Follicular starts the day after the period ends; ovulation and luteal stay as in the data.
  const ovulation = dayRange(cycle.phases.ovulation);
  const follicularEnd = ovulation ? ovulation.start - 1 : dayRange(cycle.phases.follicular)?.end;
  const phases = { period: periodEnd === 1 ? 'day 1' : `days 1–${periodEnd}` };
  if (follicularEnd && periodEnd + 1 <= follicularEnd) phases.follicular = `days ${periodEnd + 1}–${follicularEnd}`;
  phases.ovulation = cycle.phases.ovulation;
  phases.luteal = cycle.phases.luteal;

  const ringDay = Math.min(day, length);
  let phaseName = 'luteal';
  if (inPeriod || day <= periodEnd) phaseName = 'period';
  else {
    const hit = Object.entries(phases).find(([, text]) => {
      const r = dayRange(text);
      return r && ringDay >= r.start && ringDay <= r.end;
    });
    if (hit) phaseName = hit[0];
  }

  const inDays = length - day + 1;
  return { day, length, phases, phaseName, inDays: inDays > 0 ? inDays : null, inPeriod, todayLogged };
}
