// Cycle ring of moons (owner: Layal): one small dot per cycle day around a circle, starting at the top.
// Each dot takes its phase color from the phases passed in ("days 1–5", "around day 14", ...).
// Days before today are full strength, days after are dimmed, today is a larger dot with a soft pulsing ring.
// Past the cycle length, the "today" dot stays on the last day.
import { dayRange } from './helpers.js';
import s from './styles.module.css';

const SIZE = 140; // SVG user units (the viewBox), not CSS pixels
const C = SIZE / 2;
const R = 56;
const DOT = 4;
const TODAY = 7;
const HALO = 11;

const PHASE_CLASS = {
  period: s.phasePeriod,
  follicular: s.phaseFollicular,
  ovulation: s.phaseOvulation,
  luteal: s.phaseLuteal,
};

// Day 1 sits just right of the top; each day gets an equal slice of the circle.
function dayPoint(day, length) {
  const angle = ((day - 0.5) / length) * 2 * Math.PI - Math.PI / 2;
  return { x: C + R * Math.cos(angle), y: C + R * Math.sin(angle) };
}

export default function CycleRing({ day, length, phases, phaseName }) {
  const ranges = Object.entries(phases || {})
    .map(([name, text]) => ({ name, range: dayRange(text) }))
    .filter((p) => p.range && PHASE_CLASS[p.name]);

  function phaseClass(d) {
    const hit = ranges.find((p) => d >= p.range.start && d <= p.range.end);
    return hit ? PHASE_CLASS[hit.name] : s.phaseNone;
  }

  const days = Array.from({ length }, (_, i) => i + 1);
  const dotDay = Math.min(day, length);
  const today = dayPoint(dotDay, length);

  return (
    <svg
      className={s.ring}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={`Cycle day ${day} of ${length}, ${phaseName} phase`}
    >
      {days
        .filter((d) => d !== dotDay)
        .map((d) => {
          const p = dayPoint(d, length);
          return (
            <circle
              key={d}
              className={`${phaseClass(d)} ${d > dotDay ? s.dayAfter : ''}`}
              cx={p.x}
              cy={p.y}
              r={DOT}
            />
          );
        })}
      <circle className={s.todayHalo} cx={today.x} cy={today.y} r={HALO} strokeWidth="2" />
      <circle className={s.todayDot} cx={today.x} cy={today.y} r={TODAY} />
      <text className={s.ringDay} x={C} y={C} textAnchor="middle">
        Day {day}
      </text>
      <text className={s.ringOf} x={C} y={C + 20} textAnchor="middle">
        of {length}
      </text>
    </svg>
  );
}
