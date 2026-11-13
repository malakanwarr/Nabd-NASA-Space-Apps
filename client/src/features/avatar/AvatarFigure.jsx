// Avatar figure (owner: Layal): a simple SVG drawn from one person object (see avatarOptions.js).
// Exported so other screens (Habiba's Home window) can draw the same avatars: import, do not copy.
// Coordinates are SVG units in a 200 x 240 viewBox, not CSS pixels.
//
// Layers, back to front: hijab back, back hair, neck, clothes, hanging hair (braids, locs),
// face, eyes and mouth, facial hair, glasses, front hair, head covering, hijab drape.
import { CLOTHES, FIGURE, HAIR_COLORS, SKIN, hexOf, hidesHair } from './avatarOptions.js';

const SHADE = { fill: FIGURE.shade, opacity: 0.18 };

// ---------- Hair ----------
// Female hair falls to the shoulders, male hair is short (there is no length choice).
function hairLayers(type, long, color) {
  const f = { fill: color };
  switch (type) {
    case 'straight':
      return {
        back: long && <path {...f} d="M62 84 C62 48 82 38 100 38 C118 38 138 48 138 84 L140 152 L116 152 L118 96 L82 96 L84 152 L60 152 Z" />,
        front: long ? (
          <path {...f} d="M68 86 C68 52 84 42 100 42 C116 42 132 52 132 86 C126 68 114 62 100 62 C86 62 74 68 68 86 Z" />
        ) : (
          <path {...f} d="M66 86 C64 46 86 36 104 38 C124 40 138 54 134 86 C128 66 112 58 96 60 C84 62 72 70 66 86 Z" />
        ),
      };
    case 'wavy':
      return {
        back: long && (
          <path
            {...f}
            d="M62 84 C62 48 82 38 100 38 C118 38 138 48 138 84 Q148 100 138 116 Q148 134 138 152 L116 152 Q124 134 116 116 Q124 102 116 96 L84 96 Q76 102 84 116 Q76 134 84 152 L62 152 Q52 134 62 116 Q52 100 62 84 Z"
          />
        ),
        front: (
          <path
            {...f}
            d={long
              ? 'M66 88 C66 52 84 42 100 42 C116 42 134 52 134 88 Q126 70 116 74 Q108 62 100 70 Q92 62 84 74 Q74 70 66 88 Z'
              : 'M66 86 C66 50 84 40 100 40 C116 40 134 50 134 86 Q126 66 116 70 Q108 58 100 66 Q92 58 84 70 Q74 66 66 86 Z'}
          />
        ),
      };
    case 'curly':
      return {
        back: long && (
          <g {...f}>
            <circle cx="68" cy="98" r="12" />
            <circle cx="66" cy="118" r="12" />
            <circle cx="68" cy="138" r="11" />
            <circle cx="132" cy="98" r="12" />
            <circle cx="134" cy="118" r="12" />
            <circle cx="132" cy="138" r="11" />
          </g>
        ),
        front: (
          <g {...f}>
            <circle cx="74" cy="72" r="12" />
            <circle cx="86" cy="56" r="13" />
            <circle cx="100" cy="50" r="13" />
            <circle cx="114" cy="56" r="13" />
            <circle cx="126" cy="72" r="12" />
          </g>
        ),
      };
    case 'coily': {
      const rx = long ? 50 : 42;
      const ry = long ? 46 : 38;
      const cy = long ? 82 : 76;
      const bumps = Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * 2 * Math.PI;
        return { cx: 100 + rx * Math.cos(a), cy: cy + ry * Math.sin(a) };
      }).filter((b) => b.cy < cy + ry * 0.6);
      return {
        back: (
          <g {...f}>
            <ellipse cx="100" cy={cy} rx={rx} ry={ry} />
            {bumps.map((b) => (
              <circle key={`${b.cx.toFixed(1)}-${b.cy.toFixed(1)}`} cx={b.cx} cy={b.cy} r="8" />
            ))}
          </g>
        ),
        front: <path {...f} d="M72 78 C74 58 86 52 100 52 C114 52 126 58 128 78 C120 68 110 66 100 66 C90 66 80 68 72 78 Z" />,
      };
    }
    case 'braids': {
      const beads = long ? 6 : 3;
      const braid = (x) =>
        Array.from({ length: beads }, (_, i) => <ellipse key={`${x}-${i}`} cx={x} cy={98 + i * 11} rx="6" ry="6.5" />);
      return {
        mid: (
          <g {...f}>
            {braid(66)}
            {braid(134)}
          </g>
        ),
        front: (
          <g>
            <path {...f} d="M68 88 C68 52 84 42 100 42 C116 42 132 52 132 88 C126 66 114 58 100 58 C86 58 74 66 68 88 Z" />
            <path d="M100 42 L100 58" stroke={FIGURE.shade} strokeOpacity="0.3" strokeWidth="2" />
          </g>
        ),
      };
    }
    case 'locs': {
      const end = long ? 154 : 114;
      const xs = [64, 72, 128, 136];
      return {
        mid: (
          <g stroke={color} strokeWidth="8" strokeLinecap="round" fill="none">
            {xs.map((x) => (
              <path key={x} d={`M${x} 78 L${x + (x < 100 ? -2 : 2)} ${end}`} />
            ))}
          </g>
        ),
        front: (
          <g>
            <path {...f} d="M68 88 C68 52 84 42 100 42 C116 42 132 52 132 88 C126 66 114 58 100 58 C86 58 74 66 68 88 Z" />
            <g stroke={color} strokeWidth="7" strokeLinecap="round">
              <path d="M88 52 L84 70" />
              <path d="M112 52 L116 70" />
            </g>
          </g>
        ),
      };
    }
    case 'buzz':
      // A thin layer that follows the top of the head.
      return { front: <path {...f} opacity="0.75" d="M70 88 A30 36 0 0 1 130 88 Q100 72 70 88 Z" /> };
    default:
      return {}; // bald
  }
}

// ---------- Head coverings ----------
function coveringLayers(id, color) {
  const f = { fill: color };
  switch (id) {
    case 'hijab':
      return {
        back: <path {...f} d="M58 92 C56 48 78 30 100 30 C122 30 144 48 142 92 C142 122 128 140 100 144 C72 140 58 122 58 92 Z" />,
        front: <path {...f} d="M66 84 C68 54 84 46 100 46 C116 46 132 54 134 84 C126 66 114 60 100 60 C86 60 74 66 66 84 Z" />,
        drape: (
          <g>
            <path {...f} d="M60 112 C56 140 50 160 44 180 C70 162 130 162 156 180 C150 160 144 140 140 112 C134 136 118 150 100 152 C82 150 66 136 60 112 Z" />
            <path {...SHADE} d="M62 116 C66 138 82 150 100 152 C118 150 134 138 138 116 C132 144 116 156 100 157 C84 156 68 144 62 116 Z" />
          </g>
        ),
      };
    case 'headwrap':
      return {
        front: (
          <g>
            <path {...f} d="M64 86 C58 48 76 22 100 22 C126 22 144 48 136 86 C128 70 114 64 100 64 C86 64 72 70 64 86 Z" />
            <path {...SHADE} d="M70 66 C82 50 118 40 132 58 C118 50 88 54 70 66 Z" />
            <circle {...f} cx="124" cy="30" r="10" />
            <circle {...SHADE} cx="124" cy="30" r="4" />
          </g>
        ),
      };
    case 'cap':
      return {
        front: (
          <g>
            <path {...f} d="M66 80 C66 48 84 38 100 38 C116 38 134 48 134 80 Z" />
            <path {...f} d="M58 82 Q100 66 142 82 Q100 94 58 82 Z" />
            <path {...SHADE} d="M58 82 Q100 66 142 82 Q100 94 58 82 Z" />
            <circle {...SHADE} cx="100" cy="40" r="4" />
            <path d="M100 40 L100 76" stroke={FIGURE.shade} strokeOpacity="0.18" strokeWidth="2" />
          </g>
        ),
      };
    case 'turban':
      return {
        front: (
          <g>
            <path {...f} d="M62 88 C56 52 76 30 100 30 C124 30 144 52 138 88 C128 74 114 70 100 70 C86 70 72 74 62 88 Z" />
            <g fill="none" stroke={FIGURE.shade} strokeOpacity="0.2" strokeWidth="3" strokeLinecap="round">
              <path d="M68 74 Q92 44 132 62" />
              <path d="M132 76 Q108 46 68 60" />
            </g>
            <path {...SHADE} d="M94 70 L100 58 L106 70 Z" />
          </g>
        ),
      };
    default:
      return {};
  }
}

// ---------- Facial hair (male only) ----------
function FacialHair({ id, color }) {
  if (id === 'stubble') {
    return <path fill={color} opacity="0.35" d="M72 100 Q74 126 100 132 Q126 126 128 100 Q122 120 100 122 Q78 120 72 100 Z" />;
  }
  if (id === 'beard') {
    return (
      <path fill={color} d="M70 94 Q68 136 100 142 Q132 136 130 94 Q126 118 114 116 Q100 124 86 116 Q74 118 70 94 Z M90 110 Q100 118 110 110 Q100 114 90 110 Z" fillRule="evenodd" />
    );
  }
  if (id === 'mustache') {
    return <path fill={color} d="M84 106 Q92 97 100 103 Q108 97 116 106 Q108 109 100 106 Q92 109 84 106 Z" />;
  }
  return null;
}

function Glasses() {
  return (
    <g fill={FIGURE.shine} fillOpacity="0.15" stroke={FIGURE.glasses} strokeWidth="2.5">
      <circle cx="89" cy="90" r="8.5" />
      <circle cx="111" cy="90" r="8.5" />
      <path d="M97.5 90 L102.5 90 M80.5 88 L71 85 M119.5 88 L129 85" fill="none" />
    </g>
  );
}

// ---------- Clothes ----------
function Clothes({ crew, male, color, suitClass }) {
  const body = male
    ? 'M40 240 C42 176 68 150 100 150 C132 150 158 176 160 240 Z'
    : 'M46 240 C48 180 72 152 100 152 C128 152 152 180 154 240 Z';
  if (crew) {
    return (
      <g>
        <path className={suitClass} fill={FIGURE.suit} d={body} />
        <rect x="62" y="190" width="76" height="8" rx="4" fill={color} />
        <circle cx="78" cy="172" r="7" fill={FIGURE.patch} />
        <rect x="112" y="166" width="18" height="12" rx="2" fill={FIGURE.badge} />
      </g>
    );
  }
  return (
    <g>
      <path fill={color} d={body} />
      <path d="M88 153 L100 172 L112 153" fill="none" stroke={FIGURE.shade} strokeOpacity="0.22" strokeWidth="3" strokeLinejoin="round" />
    </g>
  );
}

export default function AvatarFigure({ person, crew = false, child = false, label, className, suitClass }) {
  const skin = hexOf(SKIN, person.skin);
  const hairColor = hexOf(HAIR_COLORS, person.hairColor);
  const clothes = hexOf(CLOTHES, person.clothesColor);
  const coveringColor = hexOf(CLOTHES, person.coveringColor) || clothes;
  const male = person.gender === 'male';
  const showHair = !hidesHair(person) && person.hairType !== 'bald';
  const hair = showHair ? hairLayers(person.hairType, !male, hairColor) : {};
  const cover = person.headCovering && person.headCovering !== 'none' ? coveringLayers(person.headCovering, coveringColor) : {};
  // Child: rounder face, whole figure about 82 % size, standing on the same ground line.
  const face = child ? { cy: 94, rx: 32, ry: 33 } : male ? { cy: 92, rx: 31, ry: 36 } : { cy: 92, rx: 30, ry: 36 };
  const bald = person.hairType === 'bald' && !hidesHair(person);

  return (
    <svg className={className} viewBox="0 0 200 240" role="img" aria-label={label}>
      <g transform={child ? 'translate(18 43.2) scale(0.82)' : undefined}>
        {cover.back}
        {hair.back}
        <rect x="88" y="126" width="24" height="28" fill={skin} />
        <Clothes crew={crew} male={male} color={clothes} suitClass={suitClass} />
        {hair.mid}
        <ellipse cx="100" cy={face.cy} rx={face.rx} ry={face.ry} fill={skin} />
        {bald && <ellipse cx="90" cy="66" rx="9" ry="4" fill={FIGURE.shine} opacity="0.3" />}
        <circle cx="89" cy="90" r="3" fill={FIGURE.eyes} />
        <circle cx="111" cy="90" r="3" fill={FIGURE.eyes} />
        <path d="M90 108 q10 8 20 0" fill="none" stroke={FIGURE.mouth} strokeWidth="3" strokeLinecap="round" />
        {male && <FacialHair id={person.facialHair} color={hairColor} />}
        {person.glasses && <Glasses />}
        {hair.front}
        {cover.front}
        {cover.drape}
      </g>
    </svg>
  );
}
