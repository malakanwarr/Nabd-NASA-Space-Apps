// The workout twin seen from the front or the back (owner: Layal). Pure: (move, phase, view) -> shapes.
// It is built from the same side-view pose (moves.js), so all three views stay in step with the reps:
// every joint keeps its height from the side view, and gets a left/right position here. So the squat lowers
// the body with the knees bending outward, the heel raise lifts the whole body, the deadlift tips the torso
// (it looks shorter and the bar lowers), presses and curls move the arms, the row pulls the elbows back and
// out, and cycling and running move the legs in turn. The bench press is drawn from above (lying on the bench).
// The back view is the mirror image with back-side muscles (back, glutes, hamstrings, calves, triceps).
import { FLOOR, joints, poseAt } from './moves.js';

const CX = 100;
const SW = 21; // half shoulder width
const HW = 11; // half hip width (leg tops)
const AW = 13; // half ankle width
const W = { leg: 18, arm: 12, edge: 5 };
const r1 = (n) => Math.round(n * 10) / 10;
const pt = (p) => `${r1(p[0])} ${r1(p[1])}`;
const rad = (d) => (d * Math.PI) / 180;
const lerp = (a, b, t) => a + (b - a) * t;

function limb(points, width, key) {
  const d = `M ${points.map(pt).join(' L ')}`;
  return [
    { el: 'path', cls: 'limbEdge', attrs: { key: `${key}-e`, d, strokeWidth: width + W.edge } },
    { el: 'path', cls: 'limbFill', attrs: { key: `${key}-f`, d, strokeWidth: width } },
  ];
}

function spindle(a, b, t0, t1, w) {
  const P = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const p0 = P(t0);
  const p1 = P(t1);
  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
  const nx = -(p1[1] - p0[1]) / len;
  const ny = (p1[0] - p0[0]) / len;
  const m = P((t0 + t1) / 2);
  return `M ${pt(p0)} Q ${pt([m[0] + nx * 2 * w, m[1] + ny * 2 * w])} ${pt(p1)} Q ${pt([m[0] - nx * 2 * w, m[1] - ny * 2 * w])} ${pt(p0)} Z`;
}

// Left/right positions for one side. sd: -1 screen left, +1 screen right.
function sideJoints(sideJ, hipY, shoulderY, sd, move, limbPose) {
  const depth = Math.max(0, hipY - 122); // how far the hips have dropped (squat)
  const spread = 0.35 * depth; // knees bend outward
  const a = limbPose.a;
  const e = limbPose.e;
  let elbowOut = 2;
  if (move === 'press') elbowOut = Math.max(2, 14 * Math.cos(rad(a)));
  if (move === 'row') elbowOut = 2 + 12 * Math.max(0, -Math.sin(rad(a))); // elbows pull back and out
  const elbowX = CX + sd * (SW + elbowOut);
  let wristX = elbowX;
  if (move === 'row') wristX = CX + sd * Math.max(7, SW - 14 * Math.max(0, Math.sin(rad(a + e)))); // hands meet on the handle
  return {
    hip: [CX + sd * HW, hipY],
    knee: [CX + sd * (HW + spread), sideJ.knee[1]],
    ankle: [CX + sd * AW, sideJ.ankle[1]],
    shoulder: [CX + sd * SW, shoulderY],
    elbow: [elbowX, sideJ.elbow[1]],
    wrist: [wristX, sideJ.wrist[1]],
  };
}

// Bench press from above: lying on the bench, the bar pressed straight up toward the viewer.
function benchJoints(pose, sd) {
  const t = Math.min(1, Math.max(0, (pose.near.a - 90) / 90));
  return {
    hip: [CX + sd * HW, 140],
    knee: [CX + sd * 15, 176],
    ankle: [CX + sd * 17, 210],
    shoulder: [CX + sd * SW, 74],
    elbow: [CX + sd * lerp(44, 24, t), lerp(92, 78, t)],
    wrist: [CX + sd * lerp(36, 23, t), lerp(74, 70, t)],
  };
}

function muscleShapes(L, R, hipY, shoulderY, view) {
  const midY = (hipY + shoulderY) / 2;
  const both = (fn) => [fn(L), fn(R)];
  if (view === 'back') {
    return {
      back: [{ el: 'path', d: `M ${CX} ${r1(shoulderY - 4)} L ${CX + SW - 3} ${r1(shoulderY + 5)} L ${CX + 12} ${r1(hipY - 12)} L ${CX} ${r1(hipY - 6)} L ${CX - 12} ${r1(hipY - 12)} L ${CX - SW + 3} ${r1(shoulderY + 5)} Z` }],
      glutes: both((s) => ({ el: 'ellipse', cx: r1(s.hip[0]), cy: r1(hipY + 4), rx: 9, ry: 8 })),
      thighs: both((s) => ({ el: 'path', d: spindle(s.hip, s.knee, 0.2, 0.9, 5.5) })),
      calves: both((s) => ({ el: 'path', d: spindle(s.knee, s.ankle, 0.1, 0.7, 5.5) })),
      shoulders: both((s) => ({ el: 'circle', cx: r1(s.shoulder[0]), cy: r1(s.shoulder[1]), r: 7 })),
      arms: both((s) => ({ el: 'path', d: spindle(s.shoulder, s.elbow, 0.15, 0.9, 4.5) })),
    };
  }
  return {
    chest: both((s) => ({ el: 'ellipse', cx: r1((s.shoulder[0] + CX) / 2), cy: r1(shoulderY + (midY - shoulderY) * 0.45), rx: 8.5, ry: r1(Math.max(3, (midY - shoulderY) * 0.4)) })),
    core: [{ el: 'ellipse', cx: CX, cy: r1(midY + (hipY - midY) * 0.35), rx: 8, ry: r1(Math.max(3, (hipY - midY) * 0.55)) }],
    thighs: both((s) => ({ el: 'path', d: spindle(s.hip, s.knee, 0.15, 0.9, 6) })),
    calves: both((s) => ({ el: 'path', d: spindle(s.knee, s.ankle, 0.15, 0.65, 4.5) })),
    shoulders: both((s) => ({ el: 'circle', cx: r1(s.shoulder[0]), cy: r1(s.shoulder[1]), r: 7 })),
    arms: [...both((s) => ({ el: 'path', d: spindle(s.shoulder, s.elbow, 0.15, 0.9, 4.5) })), ...both((s) => ({ el: 'path', d: spindle(s.elbow, s.wrist, 0.1, 0.8, 4) }))],
  };
}

// Which muscle groups each view can show.
export const VISIBLE = {
  side: ['thighs', 'calves', 'glutes', 'back', 'chest', 'core', 'shoulders', 'arms'],
  front: ['chest', 'core', 'thighs', 'calves', 'shoulders', 'arms'],
  back: ['back', 'glutes', 'thighs', 'calves', 'shoulders', 'arms'],
};

function glowShapes(list, ids, highlight, key) {
  if (!highlight || !highlight.fills) return [];
  const k = highlight.glow || 0;
  return ids.flatMap((id) =>
    (list[id] || []).map((sh, i) => {
      const { el, ...geo } = sh;
      const fill = highlight.fills[id];
      return {
        el,
        cls: 'twinMuscle',
        attrs: { key: `${key}-${id}-${i}`, ...geo, style: { fill, opacity: r1(0.8 + 0.2 * k), filter: `drop-shadow(0 0 ${r1(1.5 + 3 * k)}px ${fill})` } },
      };
    }),
  );
}

function gear(kind, L, R, hipY, move) {
  const out = [];
  if (kind === 'bike') {
    out.push({ el: 'path', cls: 'gearLine', attrs: { key: 'post', d: `M ${CX} ${r1(hipY + 8)} L ${CX} 186 M ${CX - 16} 186 L ${CX + 16} 186` } });
    out.push({ el: 'rect', cls: 'suitDark', attrs: { key: 'seat', x: CX - 14, y: r1(hipY + 4), width: 28, height: 6, rx: 3 } });
    out.push({ el: 'path', cls: 'gearLine', attrs: { key: 'base', d: `M 60 ${FLOOR} L 140 ${FLOOR}` } });
  } else if (kind === 'treadmill') {
    out.push({ el: 'rect', cls: 'suitDark', attrs: { key: 'belt', x: 40, y: FLOOR, width: 120, height: 8, rx: 4 } });
  } else if (move === 'bench') {
    out.push({ el: 'rect', cls: 'suitDark', attrs: { key: 'bench', x: 64, y: 52, width: 72, height: 150, rx: 10 } });
  } else {
    out.push({ el: 'path', cls: 'gearLine', attrs: { key: 'floor', d: `M 40 ${FLOOR} L 160 ${FLOOR}` } });
  }
  return out;
}

function frontGear(kind, L, R, hipY, move) {
  const out = [];
  const y = r1((L.wrist[1] + R.wrist[1]) / 2);
  if (kind === 'bar' || move === 'bench') {
    const x0 = Math.min(L.wrist[0], R.wrist[0]) - 20;
    const x1 = Math.max(L.wrist[0], R.wrist[0]) + 20;
    out.push({ el: 'path', cls: 'gearLine', attrs: { key: 'bar', d: `M ${r1(x0)} ${y} L ${r1(x1)} ${y}` } });
    out.push({ el: 'rect', cls: 'barPlate', attrs: { key: 'plateL', x: r1(x0 - 3), y: r1(y - 11), width: 6, height: 22, rx: 2 } });
    out.push({ el: 'rect', cls: 'barPlate', attrs: { key: 'plateR', x: r1(x1 - 3), y: r1(y - 11), width: 6, height: 22, rx: 2 } });
  } else if (kind === 'cable') {
    // The cable runs toward the viewer (front) or away (back), so only the handle shows.
    out.push({ el: 'path', cls: 'gearLine', attrs: { key: 'handle', d: `M ${r1(Math.min(L.wrist[0], R.wrist[0]) - 6)} ${y} L ${r1(Math.max(L.wrist[0], R.wrist[0]) + 6)} ${y}` } });
  } else if (kind === 'bike') {
    out.push({ el: 'path', cls: 'gearLine', attrs: { key: 'handlebar', d: `M ${r1(L.wrist[0] - 6)} ${y} L ${r1(R.wrist[0] + 6)} ${y}` } });
  } else if (kind === 'treadmill') {
    out.push({ el: 'path', cls: 'gearLine', attrs: { key: 'harness', d: `M ${pt(L.hip)} L 44 ${FLOOR} M ${pt(R.hip)} L 156 ${FLOOR}` } });
  }
  return out;
}

export function twinFrontShapes(move, phase, highlight, view) {
  const pose = poseAt(move, phase);
  const j = joints(pose);
  const back = view === 'back';
  // Front: her right side (the side view's near side) is on screen left. Back: the mirror image.
  const nearSd = back ? 1 : -1;
  let L;
  let R;
  let hipY = j.hip[1];
  let shoulderY = j.shoulder[1];
  let headY = j.head[1];
  if (move === 'bench') {
    const n = benchJoints(pose, nearSd);
    const f = benchJoints(pose, -nearSd);
    [L, R] = nearSd < 0 ? [n, f] : [f, n];
    hipY = 140;
    shoulderY = 74;
    headY = 48;
  } else {
    const n = sideJoints(j.near, hipY, shoulderY, nearSd, move, pose.near);
    const f = sideJoints(j.far, hipY, shoulderY, -nearSd, move, pose.far);
    [L, R] = nearSd < 0 ? [n, f] : [f, n];
  }

  const targets = Object.keys((highlight && highlight.fills) || {}).filter((id) => VISIBLE[view].includes(id));
  const muscles = muscleShapes(L, R, hipY, shoulderY, view);
  const pick = (ids) => ids.filter((id) => targets.includes(id));
  const shapes = [...gear(pose.gear, L, R, hipY, move)];

  [L, R].forEach((s, i) => {
    shapes.push(...limb([s.hip, s.knee, s.ankle], W.leg, `leg${i}`));
    shapes.push({ el: 'rect', cls: 'suitDark', attrs: { key: `boot${i}`, x: r1(s.ankle[0] - 9), y: r1(s.ankle[1] + (pose.near.lift || 0)), width: 18, height: 11, rx: 4 } });
  });
  shapes.push(...glowShapes(muscles, pick(['thighs', 'calves']), highlight, 'leg'));

  // Helmet with the visor (front) or a clear back window (back); her head is drawn inside by WorkoutTwin.
  const hy = r1(headY);
  const helmet = [
    { el: 'circle', cls: 'helmet', attrs: { key: 'helmet', cx: CX, cy: hy, r: 20 } },
    {
      el: 'ellipse',
      cls: 'visor',
      attrs: { key: 'visor', cx: CX, cy: r1(hy + 1), rx: 15, ry: 15 },
      face: { kind: back ? 'back' : 'front', cx: CX, cy: r1(hy + 1), rx: 15, ry: 15, lean: 0 },
    },
  ];
  // Seen from behind, a forward bend tips the head away, behind the body.
  const headBehind = back && pose.body.lean > 25 && move !== 'bench';
  if (headBehind) shapes.push(...helmet);

  const torso = `M ${CX - SW} ${r1(shoulderY)} L ${CX + SW} ${r1(shoulderY)} L ${CX + 13} ${r1(hipY)} L ${CX - 13} ${r1(hipY)} Z`;
  shapes.push({ el: 'path', cls: 'suit', attrs: { key: 'torso', d: torso } });
  shapes.push(...glowShapes(muscles, pick(['chest', 'core', 'back', 'glutes']), highlight, 'torso'));

  [L, R].forEach((s, i) => {
    shapes.push(...limb([s.shoulder, s.elbow, s.wrist], W.arm, `arm${i}`));
  });
  shapes.push(...glowShapes(muscles, pick(['arms', 'shoulders']), highlight, 'arm'));
  [L, R].forEach((s, i) => {
    shapes.push({ el: 'circle', cls: 'suitDark', attrs: { key: `glove${i}`, cx: r1(s.wrist[0]), cy: r1(s.wrist[1]), r: 5.5 } });
  });

  if (!headBehind) shapes.push(...helmet);

  shapes.push(...frontGear(pose.gear, L, R, hipY, move));
  return shapes;
}
