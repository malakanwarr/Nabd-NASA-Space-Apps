// The muscle twin figure (owner: Layal). Line-art astronaut in the same style as the Body screen's figure
// (helmet with visor, suit in --raised with a --muted outline, round joints, dark gloves and boots, leader
// labels), copied into this folder, not imported. The 8 muscle groups sit inside the suit like organs.
// One SVG, viewBox 320 x 400. The body is drawn around x = 84 (C) and slides: centered with labels on both
// sides when no card is open; left, labels faded out, when the callout card is open (card from x = 170).
// Female and male bodies: shoulders, waist, hips, legs and chest change; muscles, tap areas, anchors and
// label lines follow them. Muscles follow the limbs: spindles along the arm, teardrops down the thigh,
// calf bellies on the lower leg.
// Tap areas are fixed columns at least 44 units wide and tall: 320 units fit a 328 px wide stage on a
// 360 px phone, so 44 units are at least 45 px.
//   arms and shoulders: x C-78..C-34 and C+34..C+78; chest, core, back: C-34..C+34; legs: C-44..C+44.
//   labels: 44 high, x 0..78 and 242..320 (outside the body columns when centered).
// Strength sets a smooth size and color (status token mixed toward --bg): strong = full size and green,
// watch = a bit smaller and amber, weak = thinner, dark, faded amber. Words appear only in the labels.
import { MUSCLES, STATUS, statusOf } from './muscleModel.js';
import VisorFace from './VisorFace.jsx';
import s from './styles.module.css';

export const VB_W = 320;
export const VB_H = 400;
export const CARD_X = 170; // where the card starts, in viewBox units (it runs to VB_W - 4)
const C = 84; // body center when the card is open
const C_CLOSED = VB_W / 2; // centered when no card is open
const SHIFT_CLOSED = C_CLOSED - C;
const SHIFT_OPEN = 0;

// S = half shoulders, W = half waist, H = half hips, legX = thigh center, tw/kw/cw/aw = half widths of the
// thigh top, knee, calf and ankle, knee/ankle = how far knees and ankles come in toward the middle.
const BODIES = {
  female: { S: 36, W: 23, H: 44, legX: 22, tw: 18, kw: 9, cw: 11, aw: 6, knee: 3, ankle: 2 },
  male: { S: 50, W: 40, H: 36, legX: 20, tw: 16, kw: 10, cw: 12, aw: 7, knee: 1, ankle: 1 },
};

const x = (side, dx) => C + side * dx; // side: -1 left, +1 right
const both = (fn) => [fn(-1), fn(1)];
const r1 = (n) => Math.round(n * 10) / 10;

// A spindle along a limb segment: pointed ends, widest (half width w) at t along the way.
function spindle([x0, y0], [x1, y1], w, t = 0.45) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  const mx = x0 + (x1 - x0) * t;
  const my = y0 + (y1 - y0) * t;
  const c1 = [r1(mx + nx * 2 * w), r1(my + ny * 2 * w)];
  const c2 = [r1(mx - nx * 2 * w), r1(my - ny * 2 * w)];
  return { d: `M ${r1(x0)} ${r1(y0)} Q ${c1[0]} ${c1[1]} ${r1(x1)} ${r1(y1)} Q ${c2[0]} ${c2[1]} ${r1(x0)} ${r1(y0)} Z` };
}

function build(gender) {
  const female = gender !== 'male';
  const { S, W, H, legX, tw, kw, cw, aw, knee, ankle } = female ? BODIES.female : BODIES.male;
  const kx = legX - knee; // knee center
  const ax = legX - ankle; // ankle center
  const Wt = (S + W) / 2 + 1; // body half width around y = 125

  // ---------- Suit (not tappable) ----------
  const torso =
    `M ${x(-1, S - 10)} 78 Q ${C} 72 ${x(1, S - 10)} 78 Q ${x(1, S + 2)} 82 ${x(1, S)} 100 ` +
    `Q ${x(1, W + 2)} 124 ${x(1, W)} 150 Q ${x(1, H + 2)} 178 ${x(1, H)} 198 L ${x(1, H - 2)} 206 ` +
    `L ${x(-1, H - 2)} 206 L ${x(-1, H)} 198 Q ${x(-1, H + 2)} 178 ${x(-1, W)} 150 ` +
    `Q ${x(-1, W + 2)} 124 ${x(-1, S)} 100 Q ${x(-1, S + 2)} 82 ${x(-1, S - 10)} 78 Z`;
  // Tapered legs: thigh, rounded knee, calf curve, ankle.
  const legs = both(
    (sd) =>
      `M ${x(sd, legX - tw)} 200 L ${x(sd, legX + tw)} 200 Q ${x(sd, legX + tw + 1)} 246 ${x(sd, kx + kw)} 290 ` +
      `Q ${x(sd, kx + cw + 2)} 318 ${x(sd, ax + aw)} 364 L ${x(sd, ax - aw)} 364 ` +
      `Q ${x(sd, kx - cw + 1)} 318 ${x(sd, kx - kw)} 290 Q ${x(sd, legX - tw + 1)} 246 ${x(sd, legX - tw)} 200 Z`,
  );
  const shoulderPt = (sd) => [x(sd, S - 6), 92];
  const elbowPt = (sd) => [x(sd, S + 6), 150];
  const wristPt = (sd) => [x(sd, S + 12), 202];
  const arms = both((sd) => `M ${shoulderPt(sd).join(' ')} L ${elbowPt(sd).join(' ')} L ${wristPt(sd).join(' ')}`);
  const gloves = both((sd) => [x(sd, S + 13), 212]);
  const boots = both((sd) => [x(sd, ax) - 17, 360]);

  // ---------- Muscles ----------
  const shoulders = both((sd) => ({
    d: `M ${x(sd, S - 12)} 82 Q ${x(sd, S + 3)} 80 ${x(sd, S + 4)} 100 Q ${x(sd, S - 2)} 98 ${x(sd, S - 12)} 94 Z`,
  }));
  // Upper arm and forearm muscles run along the arm line.
  const upperArm = (w) => both((sd) => spindle([x(sd, S - 5), 100], [x(sd, S + 5), 146], w, 0.45));
  const forearms = both((sd) => spindle([x(sd, S + 7), 155], [x(sd, S + 12), 198], 5, 0.3));

  const co = female ? S - 10 : Math.min(S - 16, 34);
  const chest = both((sd) =>
    female
      ? { d: `M ${x(sd, 4)} 92 Q ${x(sd, co)} 86 ${x(sd, co + 1)} 106 Q ${x(sd, co)} 128 ${x(sd, 14)} 127 Q ${x(sd, 3)} 124 ${x(sd, 4)} 110 Z` }
      : { d: `M ${x(sd, 4)} 88 Q ${x(sd, co)} 84 ${x(sd, co)} 98 Q ${x(sd, co - 2)} 112 ${x(sd, 18)} 114 L ${x(sd, 4)} 112 Z` },
  );

  const abs = [132, 148, 164].flatMap((y) => [{ r: [C - 11, y, 10, 14, 4] }, { r: [C + 1, y, 10, 14, 4] }]);
  const o = Math.min(Wt - 5, 33, W - 1);
  const obliques = both((sd) => ({
    d: `M ${x(sd, 14)} 132 L ${x(sd, o)} 130 Q ${x(sd, o)} 160 ${x(sd, W - 3)} 186 L ${x(sd, 14)} 182 Z`,
  }));

  const tc = Math.min(S - 14, 33);
  const traps = {
    d:
      `M ${C} 74 Q ${x(1, 16)} 78 ${x(1, tc)} 86 Q ${x(1, 14)} 98 ${x(1, 4)} 120 L ${C} 124 ` +
      `L ${x(-1, 4)} 120 Q ${x(-1, 14)} 98 ${x(-1, tc)} 86 Q ${x(-1, 16)} 78 ${C} 74 Z`,
  };
  const lo = Math.min(S - 10, 33);
  const lats = both((sd) => ({
    d:
      `M ${x(sd, lo)} 96 Q ${x(sd, Math.min(Wt - 2, 33))} 128 ${x(sd, Math.min(W - 2, 32))} 160 ` +
      `Q ${x(sd, 14)} 174 ${x(sd, 6)} 172 L ${x(sd, 6)} 126 Q ${x(sd, lo - 12)} 106 ${x(sd, lo)} 96 Z`,
  }));
  const gx = H / 2 + 1;
  const glutes = both((sd) => ({ e: [x(sd, gx), 208, H / 2 - 3, 15] }));

  // Thigh teardrops: wide under the hip, narrowing into the knee.
  const quads = both((sd) => ({
    d:
      `M ${x(sd, legX - tw + 6)} 214 Q ${x(sd, legX)} 206 ${x(sd, legX + tw - 4)} 212 ` +
      `Q ${x(sd, legX + tw)} 248 ${x(sd, kx + 1)} 286 Q ${x(sd, legX - tw + 1)} 256 ${x(sd, legX - tw + 6)} 214 Z`,
  }));
  const hamstrings = both((sd) => ({
    d:
      `M ${x(sd, legX - tw + 5)} 226 Q ${x(sd, legX)} 220 ${x(sd, legX + tw - 4)} 226 ` +
      `Q ${x(sd, legX + tw - 2)} 256 ${x(sd, kx)} 288 Q ${x(sd, legX - tw + 2)} 260 ${x(sd, legX - tw + 5)} 226 Z`,
  }));
  // Calf bellies: one from the front, two heads from the back.
  const calvesFront = both((sd) => ({
    d:
      `M ${x(sd, kx - kw + 2)} 298 Q ${x(sd, kx)} 293 ${x(sd, kx + kw - 1)} 298 ` +
      `Q ${x(sd, kx + cw + 1)} 320 ${x(sd, ax + 1)} 352 Q ${x(sd, kx - cw + 1)} 322 ${x(sd, kx - kw + 2)} 298 Z`,
  }));
  const calvesBack = [
    ...both((sd) => ({ d: `M ${x(sd, kx)} 296 Q ${x(sd, kx + cw + 2)} 312 ${x(sd, ax + 2)} 346 Q ${x(sd, kx + 2)} 330 ${x(sd, kx)} 296 Z` })),
    ...both((sd) => ({ d: `M ${x(sd, kx - 1)} 296 Q ${x(sd, kx - cw - 1)} 314 ${x(sd, ax - 1)} 342 Q ${x(sd, kx - 2)} 326 ${x(sd, kx - 1)} 296 Z` })),
  ];

  // ---------- Tap areas [x, y, w, h] ----------
  const sideCols = (y, h) => [[C - 78, y, 44, h], [C + 34, y, 44, h]];
  const HIT = { shoulders: sideCols(70, 44), arms: sideCols(114, 112), calves: [[C - 44, 294, 88, 96]] };

  // Drawing order matters for overlapping tap areas: later groups win (side columns last).
  // anchor: right-side point where the callout line (and the right label's line) meets the muscle.
  const FRONT = [
    { id: 'chest', shapes: chest, hit: [[C - 34, 76, 68, 52]], anchor: [C + 18, 106] },
    { id: 'core', shapes: [...abs, ...obliques], hit: [[C - 34, 128, 68, 70]], anchor: [C + 18, 160] },
    { id: 'thighs', shapes: quads, hit: [[C - 44, 198, 88, 96]], anchor: [C + legX + 8, 248] },
    { id: 'calves', shapes: calvesFront, hit: HIT.calves, anchor: [C + kx + 6, 322] },
    { id: 'shoulders', shapes: shoulders, hit: HIT.shoulders, anchor: [C + S + 4, 92] },
    { id: 'arms', shapes: [...upperArm(6), ...forearms], hit: HIT.arms, anchor: [C + S + 6, 150] },
  ];

  const BACK = [
    { id: 'back', shapes: [traps, ...lats], hit: [[C - 34, 72, 68, 126]], anchor: [C + 24, 130] },
    { id: 'glutes', shapes: glutes, hit: [[C - 44, 198, 88, 46]], anchor: [C + gx + 12, 208] },
    { id: 'thighs', shapes: hamstrings, hit: [[C - 44, 244, 88, 50]], anchor: [C + legX + 8, 258] },
    { id: 'calves', shapes: calvesBack, hit: HIT.calves, anchor: [C + kx + 8, 320] },
    { id: 'shoulders', shapes: shoulders, hit: HIT.shoulders, anchor: [C + S + 4, 92] },
    { id: 'arms', shapes: [...upperArm(6.5), ...forearms], hit: HIT.arms, anchor: [C + S + 6, 150] },
  ];

  return { torso, arms, legs, gloves, boots, FRONT, BACK };
}

const BUILT = { female: build('female'), male: build('male') };
const bodyOf = (gender) => (gender === 'male' ? BUILT.male : BUILT.female);

export function groupsFor(view, gender) {
  const b = bodyOf(gender);
  return view === 'back' ? b.BACK : b.FRONT;
}

// Where the callout line starts, in viewBox units (body in its open position).
export function anchorOf(view, id, gender) {
  const g = groupsFor(view, gender).find((m) => m.id === id);
  return g ? [g.anchor[0] + SHIFT_OPEN, g.anchor[1]] : null;
}

// ---------- Labels (no card open): 3 left, 3 right, like the Body screen ----------
const LABEL_SIDES = {
  front: { left: ['shoulders', 'chest', 'arms'], right: ['core', 'thighs', 'calves'] },
  back: { left: ['shoulders', 'back', 'arms'], right: ['glutes', 'thighs', 'calves'] },
};
const LABEL_GAP = 48; // label rows at least 48 apart (44 tap height + space)
const LEFT_TEXT_X = 6;
const LEFT_EDGE = 78;
const RIGHT_EDGE = 242;
const RIGHT_TEXT_X = 246;

// Label rows: at the muscle's height, pushed down when they would overlap.
function labelLayout(view, gender) {
  const groups = groupsFor(view, gender);
  const out = [];
  ['left', 'right'].forEach((side) => {
    const sd = side === 'left' ? -1 : 1;
    const rows = LABEL_SIDES[view === 'back' ? 'back' : 'front'][side]
      .map((id) => {
        const g = groups.find((m) => m.id === id);
        const dx = g.anchor[0] - C;
        return { id, side, target: [C_CLOSED + sd * dx, g.anchor[1]] };
      })
      .sort((a, b) => a.target[1] - b.target[1]);
    let prev = -Infinity;
    rows.forEach((r) => {
      const cy = Math.max(r.target[1], prev + LABEL_GAP, 30);
      prev = cy;
      out.push({ ...r, cy });
    });
  });
  return out;
}

const lerp = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t));

// Smooth size: 0.75 at strength 40 or less, full size at 85 or more (preview: 0.78 weak, 0.9 watch, 1 strong).
export function scaleOf(strength) {
  return lerp(0.75, 1, (strength - 40) / 45);
}

// Color: the status token, made darker toward --muscle-dim (styles.module.css: --bg in dark mode, --text in
// light mode, so "darker" always moves away from the suit). Every muscle keeps at least 3:1 against the suit
// (--raised) in both themes; with the --text outline it reads clearly even when weak:
//   dark:  strong 7.2–8.5, watch 6.8–8.3, weak 3.9–4.9      light: strong 4.0–4.5, watch 4.4–5.1, weak 6.3–7.4
export function fillOf(strength) {
  const status = statusOf(strength);
  let pct;
  if (status === 'strong') pct = lerp(92, 100, (strength - 75) / 25);
  else if (status === 'watch') pct = lerp(86, 96, (strength - 60) / 14);
  else pct = lerp(62, 72, strength / 60);
  return `color-mix(in srgb, var(${STATUS[status].token}) ${Math.round(pct)}%, var(--muscle-dim))`;
}

function Shape({ shape, className }) {
  if (shape.r) {
    const [rx, ry, w, h, c] = shape.r;
    return <rect className={className} x={rx} y={ry} width={w} height={h} rx={c} />;
  }
  if (shape.e) {
    const [cx, cy, erx, ery] = shape.e;
    return <ellipse className={className} cx={cx} cy={cy} rx={erx} ry={ery} />;
  }
  return <path className={className} d={shape.d} />;
}

// The astronaut suit, line-art like the Body screen. Arms: an outline line under a fill line, round joints.
function Suit({ body, view, person }) {
  return (
    <g aria-hidden="true">
      {body.legs.map((d) => (
        <path key={d} className={s.suit} d={d} />
      ))}
      {body.boots.map(([bx, by]) => (
        <rect key={bx} className={s.suitDark} x={bx} y={by} width={34} height={18} rx={6} />
      ))}
      {body.arms.map((d) => (
        <g key={d}>
          <path className={s.limbEdge} d={d} strokeWidth={22} />
          <path className={s.limbFill} d={d} strokeWidth={17} />
        </g>
      ))}
      {body.gloves.map(([gx, gy]) => (
        <circle key={gx} className={s.suitDark} cx={gx} cy={gy} r={9} />
      ))}
      <path className={s.suit} d={body.torso} />
      <rect className={s.suitDark} x={C - 15} y={70} width={30} height={10} rx={4} />
      <circle className={s.helmet} cx={C} cy={40} r={34} />
      {/* Visor (front) or a clear back window (back), with her head filling about 80% of it. */}
      <ellipse className={s.visor} cx={C} cy={42} rx={27} ry={24} />
      <VisorFace person={person} kind={view === 'back' ? 'back' : 'front'} cx={C} cy={42} rx={27} ry={24} />
      <path className={s.shine} d={`M ${C - 22} 28 C ${C - 17} 19 ${C - 7} 15 ${C + 2} 16`} />
    </g>
  );
}

// Labels are a tap shortcut for sighted users; screen readers and keyboards use the muscle buttons,
// which say the same thing (name, strength, status), so the labels are hidden from them.
function Labels({ view, gender, strength, hidden, onSelect }) {
  const rows = labelLayout(view, gender);
  return (
    <g className={`${s.labels} ${hidden ? s.labelsHidden : ''}`} aria-hidden="true">
      {rows.map((r) => {
        const m = MUSCLES.find((mm) => mm.id === r.id);
        const status = statusOf(strength[r.id]);
        const left = r.side === 'left';
        const edge = left ? LEFT_EDGE : RIGHT_EDGE;
        return (
          <g
            key={`${r.side}-${r.id}`}
            className={s.label}
            onClick={(e) => {
              e.stopPropagation();
              if (!hidden && onSelect) onSelect(r.id);
            }}
          >
            <rect className={s.hit} x={left ? 0 : RIGHT_EDGE} y={r.cy - 22} width={LEFT_EDGE} height={44} />
            <line className={s.leader} x1={edge} y1={r.cy + 2} x2={r.target[0]} y2={r.target[1]} />
            <text className={s.labelName} x={left ? LEFT_TEXT_X : RIGHT_TEXT_X} y={r.cy - 2}>
              {m.name}
            </text>
            <text className={s[`labelStatus_${status}`]} x={left ? LEFT_TEXT_X : RIGHT_TEXT_X} y={r.cy + 15}>
              {STATUS[status].word}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// focus: today's target muscles (Today's workout); they glow softly.
// interactive = false (workout summary): a picture only, nothing tappable; label describes it.
// person: her normalized avatar (people.you); her face is drawn inside the visor on the front view.
export default function MuscleFigure({
  view,
  gender,
  person = null,
  focus = [],
  strength,
  selected,
  onSelect,
  lineY,
  interactive = true,
  label,
}) {
  const body = bodyOf(gender);
  const open = Boolean(selected);
  const anchor = open ? anchorOf(view, selected, gender) : null;
  const viewLabel = `${gender === 'male' ? 'Male' : 'Female'} astronaut, ${view === 'back' ? 'back' : 'front'} view`;
  return (
    <svg
      className={s.figure}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      role={interactive ? 'group' : 'img'}
      aria-label={label || viewLabel}
    >
      <g className={s.body} style={{ transform: `translateX(${open ? SHIFT_OPEN : SHIFT_CLOSED}px)` }}>
        <Suit body={body} view={view} person={person} />
        {groupsFor(view, gender).map((g) => {
          const m = MUSCLES.find((mm) => mm.id === g.id);
          const value = strength[g.id];
          const on = selected === g.id;
          const pick = (e) => {
            e.stopPropagation();
            onSelect(g.id);
          };
          if (!interactive) {
            return (
              <g
                key={g.id}
                className={`${s.muscleStill} ${focus.includes(g.id) ? s.focus : ''}`}
                style={{ '--k': scaleOf(value).toFixed(3), '--fill': fillOf(value) }}
              >
                {g.shapes.map((sh, i) => (
                  <Shape key={i} shape={sh} className={s.shape} />
                ))}
              </g>
            );
          }
          return (
            <g
              key={g.id}
              role="button"
              tabIndex={0}
              data-muscle={g.id}
              className={`${s.muscle} ${on ? s.muscleOn : ''} ${focus.includes(g.id) ? s.focus : ''}`}
              aria-label={`${m.name}, strength ${Math.round(value)}, ${STATUS[statusOf(value)].word}`}
              aria-pressed={on}
              style={{ '--k': scaleOf(value).toFixed(3), '--fill': fillOf(value) }}
              onClick={pick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  pick(e);
                }
              }}
            >
              {g.hit.map(([hx, hy, hw, hh]) => (
                <rect key={`${hx}-${hy}`} className={s.hit} x={hx} y={hy} width={hw} height={hh} />
              ))}
              {g.shapes.map((sh, i) => (
                <Shape key={i} shape={sh} className={s.shape} />
              ))}
            </g>
          );
        })}
      </g>
      {/* Drawn over the body so the leader lines reach the muscles (lines ignore taps). */}
      <Labels view={view} gender={gender} strength={strength} hidden={open} onSelect={interactive ? onSelect : null} />
      {anchor && lineY != null && (
        <g className={s.callout} aria-hidden="true">
          <line x1={anchor[0]} y1={anchor[1]} x2={CARD_X} y2={lineY} />
          <circle cx={anchor[0]} cy={anchor[1]} r={3} />
        </g>
      )}
    </svg>
  );
}
