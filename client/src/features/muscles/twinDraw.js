// The workout twin as a list of SVG shapes (owner: Layal). Pure: pose -> [{ el, cls, attrs }].
// Same style as the twin page: suit in --raised with a --muted outline (thick round-capped lines), dark --line
// gloves and boots, helmet with a --bg visor. Far-side limbs are drawn first and faded.
// cls names are classes in styles.module.css; WorkoutTwin.jsx turns the list into SVG elements.
// The muscles the current exercise trains are drawn over the near limbs in their strength color (fills come
// from the page: the same fillOf as the twin page), brightening a little at the top of each rep.
import { FLOOR, joints, poseAt } from './moves.js';
import { twinFrontShapes } from './twinFront.js';

const W = { leg: 20, arm: 13, torso: 30, edge: 5 };
const r1 = (n) => Math.round(n * 10) / 10;
const pt = (p) => `${r1(p[0])} ${r1(p[1])}`;

function limb(points, width, far, key) {
  const d = `M ${points.map(pt).join(' L ')}`;
  return [
    { el: 'path', cls: far ? 'twinEdgeFar' : 'limbEdge', attrs: { key: `${key}-e`, d, strokeWidth: width + W.edge } },
    { el: 'path', cls: far ? 'twinFillFar' : 'limbFill', attrs: { key: `${key}-f`, d, strokeWidth: width } },
  ];
}

function boot(side, far, key) {
  const [x, y] = side.ankle;
  const lift = side.lift || 0;
  const top = y + lift; // the boot stays on the floor when the heel lifts
  const angle = lift ? r1((Math.atan2(lift, 26) * 180) / Math.PI) : 0;
  return {
    el: 'rect',
    cls: far ? 'twinDarkFar' : 'suitDark',
    attrs: {
      key,
      x: r1(x - 8),
      y: r1(top),
      width: 26,
      height: 12,
      rx: 5,
      transform: angle ? `rotate(${angle} ${r1(x + 18)} ${r1(top + 12)})` : undefined,
    },
  };
}

function gear(kind, j, pose) {
  const out = [];
  if (kind === 'bike') {
    const [cx, cy] = pose.crank;
    const handle = [j.near.wrist[0] - 2, j.near.wrist[1] + 4];
    out.push({ el: 'path', cls: 'gearLine', attrs: { key: 'frame', d: `M ${pt([j.hip[0], j.hip[1] + 10])} L ${pt([cx, cy])} L ${pt(handle)}` } });
    out.push({ el: 'rect', cls: 'suitDark', attrs: { key: 'seat', x: r1(j.hip[0] - 12), y: r1(j.hip[1] + 6), width: 24, height: 6, rx: 3 } });
    out.push({ el: 'circle', cls: 'gearLine', attrs: { key: 'crank', cx, cy, r: 14 } });
    out.push({ el: 'path', cls: 'gearLine', attrs: { key: 'base', d: `M 70 ${FLOOR} L 160 ${FLOOR}` } });
  } else if (kind === 'treadmill') {
    out.push({ el: 'rect', cls: 'suitDark', attrs: { key: 'belt', x: 34, y: FLOOR, width: 140, height: 8, rx: 4 } });
  } else if (kind === 'bench') {
    out.push({ el: 'rect', cls: 'suitDark', attrs: { key: 'bench', x: 40, y: 184, width: 104, height: 8, rx: 4 } });
    out.push({ el: 'path', cls: 'gearLine', attrs: { key: 'benchLegs', d: `M 52 192 L 52 ${FLOOR} M 132 192 L 132 ${FLOOR}` } });
    out.push({ el: 'path', cls: 'gearLine', attrs: { key: 'floor', d: `M 30 ${FLOOR} L 176 ${FLOOR}` } });
  } else {
    out.push({ el: 'path', cls: 'gearLine', attrs: { key: 'floor', d: `M 40 ${FLOOR} L 166 ${FLOOR}` } });
  }
  return out;
}

// Things drawn over the hands and body: the bar end, the rowing cable, the harness.
function front(kind, j) {
  const out = [];
  if (kind === 'bar' || kind === 'bench') {
    const [x, y] = j.near.wrist;
    out.push({ el: 'circle', cls: 'barPlate', attrs: { key: 'plate', cx: r1(x), cy: r1(y), r: 9 } });
    out.push({ el: 'circle', cls: 'barHub', attrs: { key: 'hub', cx: r1(x), cy: r1(y), r: 2.5 } });
  } else if (kind === 'cable') {
    out.push({ el: 'path', cls: 'gearLine', attrs: { key: 'cable', d: `M ${pt(j.near.wrist)} L 186 ${r1(j.hip[1] + 14)}` } });
    out.push({ el: 'rect', cls: 'suitDark', attrs: { key: 'flywheel', x: 180, y: r1(j.hip[1] + 4), width: 14, height: 20, rx: 4 } });
  } else if (kind === 'treadmill') {
    out.push({ el: 'path', cls: 'gearLine', attrs: { key: 'harness', d: `M ${pt(j.hip)} L 46 ${FLOOR} M ${pt(j.hip)} L 162 ${FLOOR}` } });
  }
  return out;
}

// ---------- Target muscles on the side view ----------
// A spindle from a to b along a segment (from t0 to t1 of its length), half width w, pushed off the
// segment by `off` along normal n. Pure geometry.
function spindleOn(a, b, t0, t1, w, n = [0, 0], off = 0) {
  const P = (t) => [a[0] + (b[0] - a[0]) * t + n[0] * off, a[1] + (b[1] - a[1]) * t + n[1] * off];
  const p0 = P(t0);
  const p1 = P(t1);
  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
  const nx = -(p1[1] - p0[1]) / len;
  const ny = (p1[0] - p0[0]) / len;
  const m = P((t0 + t1) / 2);
  const c1 = [m[0] + nx * 2 * w, m[1] + ny * 2 * w];
  const c2 = [m[0] - nx * 2 * w, m[1] - ny * 2 * w];
  return `M ${pt(p0)} Q ${pt(c1)} ${pt(p1)} Q ${pt(c2)} ${pt(p0)} Z`;
}

const unit = (a, b) => {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
};

// Muscle shapes for one side-view pose, by muscle group id.
function muscleShapes(j) {
  const n = j.near;
  const fwd = j.forward;
  const back = [-fwd[0], -fwd[1]];
  const thighDir = unit(n.hip, n.knee);
  const shinDir = unit(n.knee, n.ankle);
  const thighFront = [thighDir[1], -thighDir[0]]; // the knee points forward, so this is the front of the thigh
  const calfBack = [-shinDir[1], shinDir[0]];
  const glute = [j.hip[0] + back[0] * 7, j.hip[1] + back[1] * 7];
  return {
    thighs: [{ el: 'path', d: spindleOn(n.hip, n.knee, 0.15, 0.9, 6.5, thighFront, 3) }],
    calves: [{ el: 'path', d: spindleOn(n.knee, n.ankle, 0.1, 0.72, 5.5, calfBack, 3) }],
    glutes: [{ el: 'ellipse', cx: r1(glute[0]), cy: r1(glute[1]), rx: 9, ry: 8 }],
    back: [{ el: 'path', d: spindleOn(j.hip, j.shoulder, 0.25, 0.92, 6.5, back, 6) }],
    chest: [{ el: 'path', d: spindleOn(j.hip, j.shoulder, 0.62, 0.95, 6, fwd, 6) }],
    core: [{ el: 'path', d: spindleOn(j.hip, j.shoulder, 0.15, 0.6, 5.5, fwd, 6) }],
    shoulders: [{ el: 'circle', cx: r1(n.shoulder[0]), cy: r1(n.shoulder[1]), r: 8 }],
    arms: [
      { el: 'path', d: spindleOn(n.shoulder, n.elbow, 0.15, 0.9, 4.5) },
      { el: 'path', d: spindleOn(n.elbow, n.wrist, 0.1, 0.8, 4) },
    ],
  };
}

// highlight: { glow: 0..1 (brightens on each rep), fills: { muscleId: CSS color } } or null.
function targetShapes(j, ids, highlight) {
  if (!highlight || !highlight.fills) return [];
  const all = muscleShapes(j);
  const k = highlight.glow || 0;
  const out = [];
  ids.forEach((id) => {
    const fill = highlight.fills[id];
    (all[id] || []).forEach((sh, i) => {
      const { el, ...geo } = sh;
      out.push({
        el,
        cls: 'twinMuscle',
        attrs: {
          key: `m-${id}-${i}`,
          ...geo,
          style: { fill, opacity: r1(0.8 + 0.2 * k), filter: `drop-shadow(0 0 ${r1(1.5 + 3 * k)}px ${fill})` },
        },
      });
    });
  });
  return out;
}

const TORSO_MUSCLES = ['back', 'chest', 'core'];
const LEG_MUSCLES = ['glutes', 'thighs', 'calves']; // glutes after the leg, which would cover them
const ARM_MUSCLES = ['arms', 'shoulders'];

// view: 'side' (default), 'front' or 'back' (twinFront.js). All three follow the same pose and clock.
export function twinShapes(move, phase, highlight = null, view = 'side') {
  if (view === 'front' || view === 'back') return twinFrontShapes(move, phase, highlight, view);
  const pose = poseAt(move, phase);
  const j = joints(pose);
  const targets = Object.keys((highlight && highlight.fills) || {});
  const pick = (group) => group.filter((id) => targets.includes(id));
  const shapes = [...gear(pose.gear, j, pose)];

  // Far side, faded, behind the body.
  shapes.push(...limb([j.far.hip, j.far.knee, j.far.ankle], W.leg, true, 'farLeg'));
  shapes.push(boot(j.far, true, 'farBoot'));
  shapes.push(...limb([j.far.shoulder, j.far.elbow, j.far.wrist], W.arm, true, 'farArm'));
  shapes.push({ el: 'circle', cls: 'twinDarkFar', attrs: { key: 'farGlove', cx: r1(j.far.wrist[0]), cy: r1(j.far.wrist[1]), r: 6 } });

  // Torso, near leg, near arm.
  shapes.push(...limb([j.hip, j.shoulder], W.torso, false, 'torso'));
  shapes.push(...targetShapes(j, pick(TORSO_MUSCLES), highlight));
  shapes.push(...limb([j.near.hip, j.near.knee, j.near.ankle], W.leg, false, 'leg'));
  shapes.push(...targetShapes(j, pick(LEG_MUSCLES), highlight));
  shapes.push(boot(j.near, false, 'boot'));
  shapes.push(...limb([j.near.shoulder, j.near.elbow, j.near.wrist], W.arm, false, 'arm'));
  shapes.push(...targetShapes(j, pick(ARM_MUSCLES), highlight));
  shapes.push({ el: 'circle', cls: 'suitDark', attrs: { key: 'glove', cx: r1(j.near.wrist[0]), cy: r1(j.near.wrist[1]), r: 6 } });

  // Helmet with the visor facing forward.
  const [hx, hy] = j.head;
  const vx = hx + j.forward[0] * 5;
  const vy = hy + j.forward[1] * 5;
  shapes.push({ el: 'circle', cls: 'helmet', attrs: { key: 'helmet', cx: r1(hx), cy: r1(hy), r: 20 } });
  shapes.push({
    el: 'ellipse',
    cls: 'visor',
    attrs: { key: 'visor', cx: r1(vx), cy: r1(vy), rx: 14, ry: 16, transform: `rotate(${r1(j.lean)} ${r1(vx)} ${r1(vy)})` },
    face: { kind: 'profile', cx: r1(vx), cy: r1(vy), rx: 14, ry: 16, lean: r1(j.lean) }, // her face in profile (WorkoutTwin)
  });

  shapes.push(...front(pose.gear, j));
  return shapes;
}
