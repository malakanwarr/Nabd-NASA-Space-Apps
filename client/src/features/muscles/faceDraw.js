// Her avatar's head inside the helmet (owner: Layal). Pure: person -> [{ el, attrs }] shapes.
// The avatar folder only exports the whole figure, so this is a simplified head drawn to match AvatarFigure's
// look (same shapes and avatar colours from avatarOptions.js, imported only; features/avatar/ is never edited).
//   frontFace(person): AvatarFigure's 200 x 240 head coordinates (face centre 100, 92; face ry 36)
//   backHead(person):  the same coordinates, seen from behind (hair or covering only)
//   profileFace(person): side view facing right, in units where the visor is rx 10, ry 12 around 0, 0
// placeFront / placeProfile give the transform that makes the face fill about 80% of a visor's height.
// The avatar colours are avatar content (the agreed exception in avatarOptions.js), not UI colours.
import { CLOTHES, FIGURE, HAIR_COLORS, SKIN, hexOf, hidesHair } from '../avatar/avatarOptions.js';

function colours(person) {
  const clothes = hexOf(CLOTHES, person.clothesColor);
  return { skin: hexOf(SKIN, person.skin), hair: hexOf(HAIR_COLORS, person.hairColor), cover: hexOf(CLOTHES, person.coveringColor) || clothes };
}

function look(person) {
  const male = person.gender === 'male';
  const cover = person.headCovering && person.headCovering !== 'none' ? person.headCovering : null;
  const showHair = !hidesHair(person) && person.hairType !== 'bald';
  return { male, cover, showHair, long: !male && person.hairType !== 'buzz', c: colours(person) };
}

const P = (d, fill, extra = {}) => ({ el: 'path', attrs: { d, fill, ...extra } });
const E = (cx, cy, rx, ry, fill, extra = {}) => ({ el: 'ellipse', attrs: { cx, cy, rx, ry, fill, ...extra } });
const O = (cx, cy, r, fill, extra = {}) => ({ el: 'circle', attrs: { cx, cy, r, fill, ...extra } });
const SHADE = { fill: FIGURE.shade, opacity: 0.18 };

const HIJAB_BACK = 'M58 92 C56 48 78 30 100 30 C122 30 144 48 142 92 C142 122 128 140 100 144 C72 140 58 122 58 92 Z';
const LONG_BACK = 'M62 84 C62 48 82 38 100 38 C118 38 138 48 138 84 L140 152 L116 152 L118 96 L82 96 L84 152 L60 152 Z';
const FRINGE_LONG = 'M68 86 C68 52 84 42 100 42 C116 42 132 52 132 86 C126 68 114 62 100 62 C86 62 74 68 68 86 Z';
const FRINGE_SHORT = 'M66 86 C64 46 86 36 104 38 C124 40 138 54 134 86 C128 66 112 58 96 60 C84 62 72 70 66 86 Z';
const CURLS_TOP = [
  [74, 72, 12],
  [86, 56, 13],
  [100, 50, 13],
  [114, 56, 13],
  [126, 72, 12],
];

function hairBack(type, long, color) {
  if (type === 'coily') return [long ? E(100, 82, 50, 46, color) : E(100, 76, 42, 38, color)];
  if (!long || type === 'buzz' || type === 'bald') return [];
  if (type === 'curly') return [98, 118, 138].flatMap((y) => [O(68, y, 12, color), O(132, y, 12, color)]);
  return [P(LONG_BACK, color)];
}

function hairFront(type, long, color) {
  switch (type) {
    case 'curly':
      return CURLS_TOP.map(([x, y, r]) => O(x, y, r, color));
    case 'coily':
      return [P('M72 78 C74 58 86 52 100 52 C114 52 126 58 128 78 C120 68 110 66 100 66 C90 66 80 68 72 78 Z', color)];
    case 'buzz':
      return [P('M70 88 A30 36 0 0 1 130 88 Q100 72 70 88 Z', color, { opacity: 0.75 })];
    case 'bald':
      return [];
    case 'wavy':
      return [
        P(
          long
            ? 'M66 88 C66 52 84 42 100 42 C116 42 134 52 134 88 Q126 70 116 74 Q108 62 100 70 Q92 62 84 74 Q74 70 66 88 Z'
            : 'M66 86 C66 50 84 40 100 40 C116 40 134 50 134 86 Q126 66 116 70 Q108 58 100 66 Q92 58 84 70 Q74 66 66 86 Z',
          color,
        ),
      ];
    default:
      return [P(long ? FRINGE_LONG : FRINGE_SHORT, color)];
  }
}

function coverFront(id, color) {
  switch (id) {
    case 'hijab': // the band over the forehead; the back piece frames the face
      return [P('M66 84 C68 54 84 46 100 46 C116 46 132 54 134 84 C126 66 114 60 100 60 C86 60 74 66 66 84 Z', color)];
    case 'headwrap':
      return [
        P('M64 86 C58 48 76 22 100 22 C126 22 144 48 136 86 C128 70 114 64 100 64 C86 64 72 70 64 86 Z', color),
        P('M70 66 C82 50 118 40 132 58 C118 50 88 54 70 66 Z', SHADE.fill, { opacity: SHADE.opacity }),
      ];
    case 'cap':
      return [
        P('M66 80 C66 48 84 38 100 38 C116 38 134 48 134 80 Z', color),
        P('M58 82 Q100 66 142 82 Q100 94 58 82 Z', color),
        P('M58 82 Q100 66 142 82 Q100 94 58 82 Z', SHADE.fill, { opacity: SHADE.opacity }),
      ];
    case 'turban':
      return [P('M62 88 C56 52 76 30 100 30 C124 30 144 52 138 88 C128 74 114 70 100 70 C86 70 72 74 62 88 Z', color)];
    default:
      return [];
  }
}

function facialHair(id, color) {
  if (id === 'stubble') return [P('M72 100 Q74 126 100 132 Q126 126 128 100 Q122 120 100 122 Q78 120 72 100 Z', color, { opacity: 0.35 })];
  if (id === 'beard') {
    return [P('M70 94 Q68 136 100 142 Q132 136 130 94 Q126 118 114 116 Q100 124 86 116 Q74 118 70 94 Z M90 110 Q100 118 110 110 Q100 114 90 110 Z', color, { fillRule: 'evenodd' })];
  }
  if (id === 'mustache') return [P('M84 106 Q92 97 100 103 Q108 97 116 106 Q108 109 100 106 Q92 109 84 106 Z', color)];
  return [];
}

export function frontFace(person) {
  const { male, cover, showHair, long, c } = look(person);
  const out = [];
  if (cover === 'hijab' || cover === 'headwrap') out.push(P(HIJAB_BACK, c.cover)); // frames the face inside the helmet
  if (showHair) out.push(...hairBack(person.hairType, long, c.hair));
  out.push(E(100, 92, male ? 31 : 30, 36, c.skin));
  out.push(O(89, 90, 3, FIGURE.eyes), O(111, 90, 3, FIGURE.eyes));
  out.push(P('M90 108 q10 8 20 0', 'none', { stroke: FIGURE.mouth, strokeWidth: 3, strokeLinecap: 'round' }));
  if (male) out.push(...facialHair(person.facialHair, c.hair));
  if (person.glasses) {
    const g = { fillOpacity: 0.15, stroke: FIGURE.glasses, strokeWidth: 2.5 };
    out.push(O(89, 90, 8.5, FIGURE.shine, g), O(111, 90, 8.5, FIGURE.shine, g));
    out.push(P('M97.5 90 L102.5 90 M80.5 88 L71 85 M119.5 88 L129 85', 'none', { stroke: FIGURE.glasses, strokeWidth: 2.5 }));
  }
  if (showHair) out.push(...hairFront(person.hairType, long, c.hair));
  if (cover) out.push(...coverFront(cover, c.cover));
  return out;
}

// Back of the head: hair or covering only (no face).
export function backHead(person) {
  const { cover, showHair, long, c } = look(person);
  const out = [];
  const head = E(100, 86, 32, 40, c.skin);
  if (cover === 'hijab') return [P(HIJAB_BACK, c.cover), E(100, 86, 34, 42, c.cover), P('M70 120 Q100 136 130 120', 'none', { stroke: FIGURE.shade, strokeOpacity: 0.2, strokeWidth: 3 })];
  if (showHair && person.hairType === 'coily') out.push(...hairBack('coily', long, c.hair));
  out.push(head);
  if (showHair) {
    const t = person.hairType;
    if (t === 'buzz') out.push(E(100, 80, 31, 34, c.hair, { opacity: 0.75 }));
    else if (t === 'curly') out.push(E(100, 82, 32, 38, c.hair), ...CURLS_TOP.map(([x, y, r]) => O(x, y + 6, r, c.hair)), ...hairBack('curly', long, c.hair));
    else if (t !== 'coily') {
      out.push(E(100, 84, 33, 40, c.hair));
      if (long) out.push(P('M66 96 L64 152 L136 152 L134 96 Z', c.hair));
      if (t === 'braids' || t === 'locs') out.push(P('M100 46 L100 150', 'none', { stroke: FIGURE.shade, strokeOpacity: 0.3, strokeWidth: 3 }));
    }
  }
  if (cover === 'headwrap') out.push(E(100, 70, 36, 34, c.cover), O(124, 30, 10, c.cover));
  if (cover === 'turban') out.push(E(100, 66, 36, 30, c.cover));
  if (cover === 'cap') out.push(P('M66 80 C66 48 84 38 100 38 C116 38 134 48 134 80 Z', c.cover));
  if (person.glasses) out.push(P('M66 90 L72 90 M128 90 L134 90', 'none', { stroke: FIGURE.glasses, strokeWidth: 3 }));
  return out;
}

// Profile, facing right: forehead, nose, lips and chin; eye; hair or covering at the back; glasses arm.
const PROFILE_FACE = 'M -6 -9 Q 1 -12.5 6 -8.5 Q 8 -6 8 -3.5 L 10.6 0.6 L 8.1 1.9 Q 8.8 3 8.3 4 Q 8.9 5.1 8.1 6.4 Q 7.6 9.2 4.8 9.9 Q 0.8 10.6 -2.5 8 L -7 8 Z';
const PROFILE_HAIR_SHORT = 'M -11.5 7 Q -12.5 -12 2 -12.6 Q 8.4 -12.2 8.7 -7.4 Q 3 -9.8 -1 -7.6 Q -4 -4 -3.6 2 Q -5 5 -6.5 7.5 Z';
const PROFILE_HAIR_LONG = 'M -12.5 14 L -12.5 -3 Q -12.5 -13 2 -12.6 Q 8.4 -12.2 8.7 -7.4 Q 3 -9.8 -1 -7.6 Q -4 -3 -3 14 Z';
const PROFILE_BEARD = 'M -2.5 5 Q -0.5 11.2 4.8 10.8 Q 9 10.2 8.6 6.6 Q 7 7.8 4.8 7.3 Q 1 6.6 -2.5 3.5 Z';

export function profileFace(person) {
  const { male, cover, showHair, long, c } = look(person);
  const out = [];
  const framed = cover === 'hijab' || cover === 'headwrap';
  if (framed) out.push(E(0, 0, 14, 16, c.cover)); // covering behind the whole head
  if (showHair && long && !cover) out.push(P(PROFILE_HAIR_LONG, c.hair));
  out.push(P(PROFILE_FACE, c.skin));
  if (!framed && !(showHair && long)) out.push(E(-2, 1, 1.7, 2.6, c.skin, { stroke: FIGURE.shade, strokeOpacity: 0.25, strokeWidth: 0.5 })); // ear
  out.push(O(5.2, -2.6, 1.15, FIGURE.eyes));
  out.push(P('M 7.4 4.6 L 8.6 4.6', 'none', { stroke: FIGURE.mouth, strokeWidth: 0.8, strokeLinecap: 'round' }));
  if (male && person.facialHair === 'beard') out.push(P(PROFILE_BEARD, c.hair));
  if (male && person.facialHair === 'stubble') out.push(P(PROFILE_BEARD, c.hair, { opacity: 0.35 }));
  if (male && person.facialHair === 'mustache') out.push(P('M 7 2.7 Q 8.8 2.2 9.9 3 Q 8.6 3.5 7 2.7 Z', c.hair));
  if (showHair && !framed) {
    if (person.hairType === 'curly' || person.hairType === 'coily') {
      out.push(...[[-6, -9, 4.6], [0, -11.5, 4.6], [5.5, -10, 4], [-9.5, -2, 4.2], [-9, 5, 4]].map(([x, y, r]) => O(x, y, r, c.hair)));
    } else if (person.hairType === 'buzz') {
      out.push(P(PROFILE_HAIR_SHORT, c.hair, { opacity: 0.75 }));
    } else if (!long) {
      out.push(P(PROFILE_HAIR_SHORT, c.hair));
    } else {
      out.push(P('M -12 -2 Q -12.5 -13 2 -12.6 Q 8.4 -12.2 8.7 -7.4 Q 3 -9.8 -1 -7.6 Q -3.5 -5 -4 -1 Z', c.hair)); // fringe over the long hair
    }
  }
  if (person.glasses) {
    out.push(O(5.4, -2.6, 2.5, FIGURE.shine, { fillOpacity: 0.15, stroke: FIGURE.glasses, strokeWidth: 0.8 }));
    out.push(P('M 2.9 -2.9 L -2.5 -3.6', 'none', { stroke: FIGURE.glasses, strokeWidth: 0.8 }));
  }
  if (cover === 'hijab') {
    // Wraps over the forehead, behind the face and under the chin: the face sits in the opening.
    out.push(P('M -15 -17 H 12 V -9 Q 8 -9.5 6.2 -8.7 Q 2 -11.4 -1.5 -8.6 Q -4 -3 -3 4 Q -1.5 9.6 4.8 10.4 Q 8.6 10.8 9.5 17 H -15 Z', c.cover));
  }
  if (cover === 'headwrap') out.push(P('M -15 -17 H 12 V -7 Q 6 -11 -1 -8 Q -4.5 -3.5 -4 3 L -15 6 Z', c.cover));
  if (cover === 'turban') out.push(P('M -15 -17 H 12 V -6.6 Q 2 -10 -4.5 -6 L -15 -2 Z', c.cover));
  if (cover === 'cap') {
    if (showHair) out.push(P(PROFILE_HAIR_SHORT, c.hair));
    out.push(P('M -9.5 -5 Q -9.5 -13.5 2 -13.5 Q 9 -13 9 -6.5 Z', c.cover), P('M 4 -7.2 L 14 -5.6 L 14 -4 L 4 -5.6 Z', c.cover));
  }
  return out;
}

// Transforms: the head fills about 80% of the visor height.
export function placeFront(cx, cy, ry) {
  const scale = (0.8 * 2 * ry) / 72; // the avatar face is 72 tall
  return `translate(${cx} ${cy + ry * 0.06}) scale(${scale.toFixed(3)}) translate(-100 -92)`;
}

export function placeProfile(cx, cy, ry, lean = 0) {
  return `translate(${cx} ${cy}) rotate(${lean}) scale(${(ry / 12).toFixed(3)})`;
}
