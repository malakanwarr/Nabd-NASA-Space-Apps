// The living room at home (owner: Habiba): a lamp, a window onto the night sky, a sofa with the family
// on it, and you next to them, from space. Everyone is drawn by Layal's AvatarFigure from the saved
// avatars, so the scene changes when an avatar changes. All colors come from the theme variables.
// Coordinates are SVG units on a 360 x 270 canvas; the avatars are placed in the same units as percentages.
import AvatarFigure from '../avatar/AvatarFigure.jsx';
import { describe } from '../avatar/avatarOptions.js';
import { FAMILY_IDS, personMeta } from './useAvatars.js';
import s from './styles.module.css';

const W = 360;
const H = 270;
const pctX = (x) => `${(x / W) * 100}%`;
const pctY = (y) => `${(y / H) * 100}%`;

// Where each person sits on the sofa (left edge and top, in canvas units).
const SEATS = { omar: { x: 68, y: 110 }, laila: { x: 116, y: 110 }, mona: { x: 164, y: 110 } };
const SEAT_WIDTH = 60;

const STARS = [
  [84, 34, 1.4],
  [112, 70, 1.1],
  [128, 30, 1.2],
  [172, 44, 1.4],
  [176, 82, 1.1],
  [92, 86, 1.1],
  [150, 90, 1],
];

export default function HomeScene({ avatars, city }) {
  const you = personMeta('you');
  return (
    <figure className={s.scene} aria-label={`Your family's living room in ${city} at night`}>
      {/* Back: wall, floor, window, lamp, the back of the sofa. */}
      <svg className={s.layer} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
        <rect className={s.wall} x="0" y="0" width={W} height="206" />
        <rect className={s.floor} x="0" y="206" width={W} height="64" />
        <rect className={s.baseboard} x="0" y="204" width={W} height="4" />
        <ellipse className={s.rug} cx="142" cy="238" rx="124" ry="18" />

        {/* Window onto the night sky */}
        <rect className={s.sky} x="64" y="18" width="132" height="84" rx="6" />
        {STARS.map(([x, y, r]) => (
          <circle key={`${x}-${y}`} className={s.star} cx={x} cy={y} r={r} />
        ))}
        <circle className={s.moon} cx="104" cy="52" r="13" />
        <circle className={s.moonShade} cx="110" cy="48" r="12" />
        <path
          className={s.heart}
          d="M156 66 C156 60 148 59 148 65 C148 70 156 75 156 75 C156 75 164 70 164 65 C164 59 156 60 156 66 Z"
        />
        <rect className={s.frame} x="64" y="18" width="132" height="84" rx="6" />
        <path className={s.frame} d="M130 18 L130 102 M64 60 L196 60" />
        <rect className={s.sill} x="58" y="102" width="144" height="6" rx="3" />

        {/* Lamp */}
        <circle className={s.glow} cx="22" cy="132" r="40" />
        <circle className={s.glow} cx="22" cy="132" r="24" />
        <path className={s.lampPole} d="M22 148 L22 204" />
        <ellipse className={s.lampBase} cx="22" cy="204" rx="11" ry="3.5" />
        <path className={s.lampShade} d="M10 148 L14 120 L30 120 L34 148 Z" />

        {/* Sofa, back */}
        <rect className={s.sofaBack} x="54" y="118" width="176" height="66" rx="16" />
      </svg>

      {FAMILY_IDS.map((id) => {
        const meta = personMeta(id);
        const seat = SEATS[id];
        return (
          <div key={id} className={s.seated} style={{ left: pctX(seat.x), top: pctY(seat.y), width: pctX(SEAT_WIDTH) }}>
            <AvatarFigure person={avatars[id]} child={meta.child} label={describe(avatars[id], meta)} className={s.fill} />
          </div>
        );
      })}

      {/* Front: the seat and the arms, over the lower part of the people. */}
      <svg className={s.layer} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
        <rect className={s.sofaSeat} x="44" y="170" width="192" height="36" rx="10" />
        <path className={s.seam} d="M108 172 L108 204 M172 172 L172 204" />
        <rect className={s.sofaArm} x="38" y="138" width="30" height="72" rx="14" />
        <rect className={s.sofaArm} x="212" y="138" width="30" height="72" rx="14" />
        <rect className={s.sofaLeg} x="52" y="210" width="8" height="8" rx="2" />
        <rect className={s.sofaLeg} x="220" y="210" width="8" height="8" rx="2" />
      </svg>

      {/* You, from space: a round window into the dark, next to the sofa. */}
      <div className={s.porthole} style={{ left: pctX(256), top: pctY(100), width: pctX(86), height: pctY(86) }}>
        <AvatarFigure person={avatars.you} crew label={describe(avatars.you, you)} className={s.youFigure} suitClass={s.suitEdge} />
      </div>
      <figcaption className={s.youLabel} style={{ left: pctX(239), top: pctY(192), width: pctX(120) }}>
        You, from space
      </figcaption>
    </figure>
  );
}
