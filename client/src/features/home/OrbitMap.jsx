import s from './homePage.module.css';

// The road to Mars: Earth on the left, Mars on the right, and between them a heartbeat pulse like the logo
// ("Pulse to Mars"). The solid part is the way travelled, the dashed part the way still to go, and Sara's
// dot sits on the pulse at the mission progress. Illustrative, not to scale. SVG units on a 360 x 150 canvas.
const W = 360;
const H = 150;
const EARTH = { x: 46, y: 88, r: 24 };
const MARS = { x: 312, y: 88, r: 15 };
const LABEL_Y = 136;

// From Earth's right edge to Mars's left edge, at the planets' height.
const X0 = EARTH.x + EARTH.r + 2;
const X1 = MARS.x - MARS.r - 1;
const BASE_Y = EARTH.y;

// The heartbeat: [share of the way across, height above the line].
// Flat, a small bump, a tall sharp spike, a dip, a smaller spike, then flat into Mars.
const BEAT = [
  [0, 0], [0.12, 0], [0.16, 9], [0.2, 0], [0.27, 0], [0.3, -5], [0.35, 62],
  [0.41, -26], [0.45, 0], [0.51, 0], [0.55, 26], [0.59, 0], [1, 0],
];
const POINTS = BEAT.map(([share, up]) => [X0 + (X1 - X0) * share, BASE_Y - up]);

// The pulse split at a share p of the way across, Earth to Mars: the points up to there, and the point itself.
// (By distance across, not by line length, so the spikes do not hold her back: day 142 of 210 sits about
// 68 % of the way to Mars.)
function splitAt(p) {
  const x = X0 + (X1 - X0) * p;
  for (let i = 1; i < POINTS.length; i += 1) {
    const [ax, ay] = POINTS[i - 1];
    const [bx, by] = POINTS[i];
    if (x <= bx) {
      const k = bx === ax ? 0 : (x - ax) / (bx - ax);
      const at = [x, ay + (by - ay) * k];
      return { before: [...POINTS.slice(0, i), at], after: [at, ...POINTS.slice(i)], at };
    }
  }
  const at = POINTS[POINTS.length - 1];
  return { before: POINTS, after: [at], at };
}

const toPath = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

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
  const { before, after, at } = splitAt(p);
  const [sx, sy] = at;

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

      {/* Still to go: the same pulse, dashed and faint. Travelled: solid, drawn in once when Home opens. */}
      <path d={toPath(after)} className={s.orbitPlan} />
      <path d={toPath(before)} pathLength="100" className={s.orbitTrail} />

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
      {/* The pulse's end on Mars, like the logo */}
      <circle cx={X1} cy={BASE_Y} r="3.5" className={s.pulseEnd} />

      {/* Sara on the pulse, with her name above it. She appears when the line reaches her, then her halo
          beats slowly. */}
      <g className={s.shipArrive}>
        <circle cx={sx} cy={sy} r="11" className={s.shipHalo} />
        <circle cx={sx} cy={sy} r="5" className={s.ship} />
      </g>
      <g className={s.shipArrive} transform={`translate(${sx} ${sy - 22})`}>
        <rect x="-22" y="-12" width="44" height="22" rx="11" className={s.shipTag} />
        <text x="0" y="4" textAnchor="middle" className={s.orbitLabelStrong}>
          Sara
        </text>
      </g>
    </svg>
  );
}
