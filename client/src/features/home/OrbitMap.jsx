import s from './homePage.module.css';

const W = 360;
const H = 210;
const CX = 180;
const CY = 105;
const R_EARTH = 48;
const R_MARS = 88;
const START = Math.PI * 0.9; // where the ship left Earth
const SWEEP = Math.PI * 0.85; // how far round the Sun the transfer goes
const TAU = Math.PI * 2;

const pt = (r, a) => [CX + r * Math.cos(a), CY + r * Math.sin(a)];
const along = (t) => pt(R_EARTH + (R_MARS - R_EARTH) * t, START + SWEEP * t);

// Illustrative, not to scale. Earth and Mars angles follow real orbit periods
// (365 and 687 days) so Mars ends up where the ship arrives on the arrival day.
export default function OrbitMap({ day, totalDays }) {
  const p = Math.max(0, Math.min(1, day / totalDays));
  const steps = 40;
  const trail = Array.from({ length: steps + 1 }, (_, i) => along((p * i) / steps));
  const full = Array.from({ length: steps + 1 }, (_, i) => along(i / steps));
  const toPath = (pts) =>
    pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

  const [sx, sy] = along(p);
  const [ex, ey] = pt(R_EARTH, START + (TAU * day) / 365);
  const [mx, my] = pt(R_MARS, START + SWEEP - (TAU * (totalDays - day)) / 687);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={s.orbit}
      role="img"
      aria-label={`Orbit map: day ${day} of ${totalDays}, between Earth and Mars`}
    >
      <circle cx={CX} cy={CY} r={R_EARTH} className={s.orbitRing} />
      <circle cx={CX} cy={CY} r={R_MARS} className={s.orbitRing} />
      <path d={toPath(full)} className={s.orbitPlan} />
      <path d={toPath(trail)} className={s.orbitTrail} />

      <circle cx={CX} cy={CY} r="9" className={s.sun} />

      <circle cx={ex} cy={ey} r="7" className={s.earth} />
      <text x={ex} y={ey + 22} textAnchor="middle" className={s.orbitLabel}>
        Earth
      </text>

      <circle cx={mx} cy={my} r="6" className={s.mars} />
      <text x={mx} y={my + 22} textAnchor="middle" className={s.orbitLabel}>
        Mars
      </text>

      <circle cx={sx} cy={sy} r="9" className={s.shipHalo} />
      <circle cx={sx} cy={sy} r="4" className={s.ship} />
      <text x={sx} y={sy - 14} textAnchor="middle" className={s.orbitLabelStrong}>
        Sara
      </text>
    </svg>
  );
}
