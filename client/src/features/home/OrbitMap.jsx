import s from './homePage.module.css';

// The road to Mars: Earth on the left, Mars on the right, the route between them as an arc, and Sara's
// ship on it. The solid line is the way travelled, the dotted line the way still to go.
// Illustrative, not to scale. Coordinates are SVG units on a 360 x 150 canvas.
const W = 360;
const H = 150;
const EARTH = { x: 46, y: 88, r: 24 };
const MARS = { x: 312, y: 88, r: 15 };
const START = [EARTH.x + EARTH.r - 2, EARTH.y - 10];
const CONTROL = [180, -4];
const END = [MARS.x - MARS.r + 2, MARS.y - 8];
const LABEL_Y = 136;

// A point a share t (0 to 1) of the way along the curve.
function along(t) {
  const u = 1 - t;
  return [
    u * u * START[0] + 2 * u * t * CONTROL[0] + t * t * END[0],
    u * u * START[1] + 2 * u * t * CONTROL[1] + t * t * END[1],
  ];
}

function toPath(from, to, steps = 40) {
  return Array.from({ length: steps + 1 }, (_, i) => along(from + ((to - from) * i) / steps))
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
}

const STARS = [
  [120, 24, 1.2],
  [210, 14, 1],
  [270, 34, 1.3],
  [88, 52, 1],
  [158, 62, 1],
  [236, 66, 1.1],
  [344, 40, 1],
  [16, 36, 1.1],
  [190, 112, 1],
  [100, 118, 1],
  [262, 120, 1.1],
];

export default function OrbitMap({ day, totalDays }) {
  const p = Math.max(0, Math.min(1, day / totalDays));
  const [sx, sy] = along(p);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={s.orbit}
      role="img"
      aria-label={`Road to Mars: day ${day} of ${totalDays}, between Earth and Mars`}
    >
      {STARS.map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} className={s.orbitStar} />
      ))}

      <path d={toPath(0, 1)} className={s.orbitPlan} />
      <path d={toPath(0, p)} className={s.orbitTrail} />

      {/* Earth: ocean, a hint of land, and a thin glow */}
      <circle cx={EARTH.x} cy={EARTH.y} r={EARTH.r + 5} className={s.earthGlow} />
      <circle cx={EARTH.x} cy={EARTH.y} r={EARTH.r} className={s.earth} />
      <path
        className={s.land}
        d="M34 78 C38 70 48 70 50 76 C52 82 46 84 44 90 C40 96 32 92 34 78 Z M52 96 C58 92 64 96 62 102 C58 106 52 104 52 96 Z"
      />
      <text x={EARTH.x} y={LABEL_Y} textAnchor="middle" className={s.orbitLabel}>
        Earth
      </text>

      {/* Mars: a rusty ball with two craters */}
      <circle cx={MARS.x} cy={MARS.y} r={MARS.r} className={s.mars} />
      <circle cx={MARS.x - 4} cy={MARS.y - 3} r="3" className={s.crater} />
      <circle cx={MARS.x + 5} cy={MARS.y + 5} r="2" className={s.crater} />
      <text x={MARS.x} y={LABEL_Y} textAnchor="middle" className={s.orbitLabel}>
        Mars
      </text>

      {/* Sara's ship, with her name above it */}
      <circle cx={sx} cy={sy} r="11" className={s.shipHalo} />
      <circle cx={sx} cy={sy} r="5" className={s.ship} />
      <g transform={`translate(${sx} ${sy - 22})`}>
        <rect x="-22" y="-12" width="44" height="22" rx="11" className={s.shipTag} />
        <text x="0" y="4" textAnchor="middle" className={s.orbitLabelStrong}>
          Sara
        </text>
      </g>
    </svg>
  );
}
