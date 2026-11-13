// The twin's moves in workout mode (owner: Layal). Pure maths, no UI.
// Side view, facing right, in a 200 x 240 viewBox, floor at y = 220. A pose is:
//   hx, hy   hip position          lean   torso tilt from upright (degrees, + = forward)
//   ax, ay   ankle position        lift   heel lift (heel raise)
//   a, e     arm: upper arm angle from straight down (degrees, + = forward), elbow bend (+ = forearm forward/up)
// Each rep is pose A -> pose B -> pose A with a soft ease, one loop per tempo (4 s). Cycling and running are
// worked out from the loop position instead (pedal circle, stride). Knees come from a two-bone solver so the
// feet stay where they are.

export const FLOOR = 220;
export const SIZES = { thigh: 44, shin: 44, torso: 62, upper: 34, fore: 32, head: 20 };

const STAND = { hx: 100, hy: 122, lean: 4, ax: 102, ay: 208, lift: 0, a: 0, e: 8 };
const BAR_AT_SHOULDERS = { a: -15, e: 165 };
const pose = (over) => ({ ...STAND, ...over });

// Keyframes: [t (0..1 of one loop), pose]. Loops back to the first.
const KEYS = {
  squat: [
    [0, pose(BAR_AT_SHOULDERS)],
    [0.5, pose({ hx: 80, hy: 166, lean: 32, a: 10, e: 165 })],
  ],
  heelRaise: [
    [0, pose(BAR_AT_SHOULDERS)],
    [0.4, pose({ ...BAR_AT_SHOULDERS, hy: 110, ay: 196, lift: 12 })],
    [0.6, pose({ ...BAR_AT_SHOULDERS, hy: 110, ay: 196, lift: 12 })], // short hold at the top
  ],
  deadlift: [
    [0, pose({ a: 0, e: 0 })],
    [0.5, pose({ hx: 70, hy: 128, lean: 60, a: 0, e: 0 })],
  ],
  row: [
    [0, pose({ hx: 92, hy: 132, lean: 20, ax: 104, a: 60, e: 0 })],
    [0.5, pose({ hx: 92, hy: 132, lean: 10, ax: 104, a: -30, e: 100 })],
  ],
  bench: [
    [0, pose({ hx: 130, hy: 170, lean: -90, ax: 160, a: 90, e: 90 })],
    [0.5, pose({ hx: 130, hy: 170, lean: -90, ax: 160, a: 180, e: 0 })],
  ],
  press: [
    [0, pose({ a: 20, e: 150 })],
    [0.5, pose({ a: 175, e: 0 })],
  ],
  curl: [
    [0, pose({ a: 0, e: 0 })],
    [0.5, pose({ a: 5, e: 140 })],
  ],
  mobility: [
    [0, pose({ a: 0, e: 0 })],
    [0.3, pose({ lean: 0, a: 175, e: 0 })], // reach overhead
    [0.45, pose({ lean: 0, a: 175, e: 0 })],
    [0.75, pose({ hx: 94, lean: 45, a: 0, e: 0 })], // gentle half forward fold
  ],
  rest: [[0, pose({ a: 0, e: 6 })]],
};

// What is drawn with each move.
export const GEAR = {
  squat: 'bar',
  heelRaise: 'bar',
  deadlift: 'bar',
  row: 'cable',
  bench: 'bench',
  press: 'bar',
  curl: 'bar',
  cycle: 'bike',
  run: 'treadmill',
  mobility: null,
  rest: null,
};

const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const lerp = (a, b, t) => a + (b - a) * t;
const rad = (d) => (d * Math.PI) / 180;

function mix(p, q, t) {
  const out = {};
  Object.keys(p).forEach((k) => {
    out[k] = lerp(p[k], q[k], t);
  });
  return out;
}

function fromKeys(keys, phase) {
  if (keys.length === 1) return { ...keys[0][1] };
  const list = [...keys, [1, keys[0][1]]];
  for (let i = 0; i < list.length - 1; i += 1) {
    const [t0, p0] = list[i];
    const [t1, p1] = list[i + 1];
    if (phase >= t0 && phase <= t1) return mix(p0, p1, ease(t1 === t0 ? 0 : (phase - t0) / (t1 - t0)));
  }
  return { ...keys[0][1] };
}

/**
 * The pose at a point in the loop (phase 0..1). Returns { body, near, far, gear, farShift }:
 *   body { hx, hy, lean }, near / far { ax, ay, lift, a, e }.
 * farShift: how far the far-side limbs sit behind (symmetric moves), 0 when they move on their own.
 */
export function poseAt(move, phase) {
  const p = ((phase % 1) + 1) % 1;
  if (move === 'cycle') {
    const crank = [112, 186];
    const r = 14;
    const foot = (q) => ({ ax: crank[0] + r * Math.cos(2 * Math.PI * q), ay: crank[1] + r * Math.sin(2 * Math.PI * q), lift: 0, a: 55, e: 10 });
    return { body: { hx: 90, hy: 128, lean: 20 }, near: foot(p), far: foot(p + 0.5), gear: 'bike', farShift: 0, crank };
  }
  if (move === 'run') {
    const leg = (q) => {
      const s = Math.sin(2 * Math.PI * q);
      const c = Math.cos(2 * Math.PI * q);
      return { ax: 100 + 24 * s, ay: 208 - Math.max(0, 16 * c), lift: 0, a: -28 * s, e: 80 };
    };
    const bob = 2 * Math.abs(Math.sin(2 * Math.PI * p));
    return { body: { hx: 100, hy: 120 + bob, lean: 8 }, near: leg(p), far: leg(p + 0.5), gear: 'treadmill', farShift: 0 };
  }
  const k = fromKeys(KEYS[move] || KEYS.rest, p);
  if (move === 'rest') k.hy += 1.5 * Math.sin(2 * Math.PI * p); // slow breathing
  const limb = { ax: k.ax, ay: k.ay, lift: k.lift, a: k.a, e: k.e };
  return { body: { hx: k.hx, hy: k.hy, lean: k.lean }, near: limb, far: { ...limb }, gear: GEAR[move] || null, farShift: -5 };
}

// Two-bone solver: the knee between hip and ankle, bending forward (to the right).
export function knee(hip, ankle) {
  const L = SIZES.thigh;
  const dx = ankle[0] - hip[0];
  const dy = ankle[1] - hip[1];
  const d = Math.min(Math.hypot(dx, dy), 2 * L - 0.5);
  const ux = dx / (Math.hypot(dx, dy) || 1);
  const uy = dy / (Math.hypot(dx, dy) || 1);
  const h = Math.sqrt(Math.max(0, L * L - (d / 2) ** 2));
  let nx = -uy;
  let ny = ux;
  if (nx < 0) {
    nx = -nx;
    ny = -ny;
  }
  return [hip[0] + ux * (d / 2) + nx * h, hip[1] + uy * (d / 2) + ny * h];
}

// Points for drawing one pose.
export function joints(pose) {
  const { hx, hy, lean } = pose.body;
  const up = [Math.sin(rad(lean)), -Math.cos(rad(lean))];
  const hip = [hx, hy];
  const shoulder = [hx + SIZES.torso * up[0], hy + SIZES.torso * up[1]];
  const head = [hx + (SIZES.torso + 27) * up[0], hy + (SIZES.torso + 27) * up[1]];
  const forward = [Math.cos(rad(lean)), Math.sin(rad(lean))];
  const side = (limb, shift) => {
    const h = [hip[0] + shift, hip[1]];
    const s = [shoulder[0] + shift, shoulder[1]];
    const ankle = [limb.ax + shift, limb.ay];
    const elbow = [s[0] + SIZES.upper * Math.sin(rad(limb.a)), s[1] + SIZES.upper * Math.cos(rad(limb.a))];
    const wrist = [elbow[0] + SIZES.fore * Math.sin(rad(limb.a + limb.e)), elbow[1] + SIZES.fore * Math.cos(rad(limb.a + limb.e))];
    return { hip: h, knee: knee(h, ankle), ankle, lift: limb.lift || 0, shoulder: s, elbow, wrist };
  };
  return {
    hip,
    shoulder,
    head,
    forward,
    lean,
    near: side(pose.near, 0),
    far: side(pose.far, pose.farShift || 0),
  };
}
