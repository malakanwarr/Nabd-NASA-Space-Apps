// Avatar options and rules (owner: Layal). Data only, no UI.
// The hex values here are AVATAR CONTENT (skin, hair and clothes colors from the design board), not UI colors:
// an agreed exception to the theme-variables rule. UI colors still come from shared/theme.css.
// Hair color hex values are not on the board; they were proposed in the plan and approved.

export const PEOPLE = [
  { id: 'you', name: 'You', crew: true, child: false },
  { id: 'omar', name: 'Omar', crew: false, child: false },
  { id: 'laila', name: 'Laila', crew: false, child: true },
  { id: 'mona', name: 'Mona', crew: false, child: false },
];

export const GENDERS = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
];

export const SKIN = [
  { id: 'veryLight', label: 'Very light', hex: '#F3D3BD' },
  { id: 'light', label: 'Light', hex: '#E0AC69' },
  { id: 'medium', label: 'Medium', hex: '#C68B59' },
  { id: 'brown', label: 'Brown', hex: '#8D5524' },
  { id: 'darkBrown', label: 'Dark brown', hex: '#5C3A21' },
  { id: 'deep', label: 'Deep', hex: '#3B2414' },
];

// Suit stripe, shirt and head covering colors.
export const CLOTHES = [
  { id: 'skyBlue', label: 'Sky blue', hex: '#7CC4FF' },
  { id: 'lavender', label: 'Lavender', hex: '#B9A7FF' },
  { id: 'green', label: 'Green', hex: '#6EE0A8' },
  { id: 'amber', label: 'Amber', hex: '#FFC857' },
  { id: 'marsOrange', label: 'Mars orange', hex: '#E07A4B' },
];

export const HAIR_TYPES = [
  { id: 'straight', label: 'Straight' },
  { id: 'wavy', label: 'Wavy' },
  { id: 'curly', label: 'Curly' },
  { id: 'coily', label: 'Coily' },
  { id: 'braids', label: 'Braids' },
  { id: 'locs', label: 'Locs' },
  { id: 'buzz', label: 'Buzz cut' },
  { id: 'bald', label: 'Bald' },
];

export const HAIR_COLORS = [
  { id: 'black', label: 'Black', hex: '#1C1410' },
  { id: 'darkBrown', label: 'Dark brown', hex: '#2B1A10' },
  { id: 'brown', label: 'Brown', hex: '#5A3825' },
  { id: 'blonde', label: 'Blonde', hex: '#D9B26F' },
  { id: 'red', label: 'Red', hex: '#A8432A' },
  { id: 'gray', label: 'Gray', hex: '#A7A9AC' },
];

// Which head coverings each gender can pick. hidesHair: the covering is drawn over the hair and hides it.
export const COVERINGS = {
  female: [
    { id: 'hijab', label: 'Hijab', hidesHair: true },
    { id: 'headwrap', label: 'Headwrap', hidesHair: true },
    { id: 'none', label: 'None', hidesHair: false },
  ],
  male: [
    { id: 'cap', label: 'Cap', hidesHair: false },
    { id: 'turban', label: 'Turban', hidesHair: true },
    { id: 'none', label: 'None', hidesHair: false },
  ],
};

export const FACIAL_HAIR = [
  { id: 'none', label: 'None' },
  { id: 'stubble', label: 'Stubble' },
  { id: 'beard', label: 'Beard' },
  { id: 'mustache', label: 'Mustache' },
];

// Fixed figure colors (from the board), plus a shade and a shine used at low opacity.
export const FIGURE = {
  eyes: '#2B1A10',
  mouth: '#7A3F2A',
  suit: '#E6EAF2',
  patch: '#0B3D91',
  badge: '#AEB9D6',
  glasses: '#2B1A10',
  shade: '#000000',
  shine: '#FFFFFF',
};

export const DEFAULTS = {
  you: {
    gender: 'female', skin: 'medium', hairType: 'straight', hairColor: 'black', facialHair: null,
    headCovering: 'hijab', coveringColor: 'skyBlue', glasses: false, clothesColor: 'skyBlue',
  },
  omar: {
    gender: 'male', skin: 'brown', hairType: 'straight', hairColor: 'black', facialHair: 'none',
    headCovering: 'none', coveringColor: null, glasses: false, clothesColor: 'skyBlue',
  },
  laila: {
    gender: 'female', skin: 'light', hairType: 'curly', hairColor: 'darkBrown', facialHair: null,
    headCovering: 'none', coveringColor: null, glasses: false, clothesColor: 'green',
  },
  mona: {
    gender: 'female', skin: 'medium', hairType: 'straight', hairColor: 'gray', facialHair: null,
    headCovering: 'hijab', coveringColor: 'lavender', glasses: false, clothesColor: 'lavender',
  },
};

export function findOption(list, id) {
  return (list || []).find((o) => o.id === id);
}

export function hexOf(list, id) {
  return findOption(list, id)?.hex;
}

export function coveringOf(person) {
  return findOption(COVERINGS[person.gender], person.headCovering);
}

export function hidesHair(person) {
  return Boolean(coveringOf(person)?.hidesHair);
}

// Switching gender resets what no longer applies: facial hair (female) and coverings of the other gender.
export function setGender(person, gender) {
  const next = { ...person, gender };
  if (!findOption(COVERINGS[gender], person.headCovering)) next.headCovering = 'none';
  if (next.headCovering === 'none') next.coveringColor = null;
  next.facialHair = gender === 'male' ? (findOption(FACIAL_HAIR, person.facialHair) ? person.facialHair : 'none') : null;
  return next;
}

export function setCovering(person, id) {
  return {
    ...person,
    headCovering: id,
    coveringColor: id === 'none' ? null : person.coveringColor || person.clothesColor,
  };
}

function pick(list, value, fallback) {
  return findOption(list, value) ? value : fallback;
}

// Saved JSON (or nothing) -> a complete, valid person for each of the four. Unknown values fall back to defaults.
export function normalize(saved) {
  const out = {};
  PEOPLE.forEach(({ id }) => {
    const d = DEFAULTS[id];
    const s = (saved && saved.people && saved.people[id]) || {};
    const gender = pick(GENDERS, s.gender, d.gender);
    const p = {
      gender,
      skin: pick(SKIN, s.skin, d.skin),
      hairType: pick(HAIR_TYPES, s.hairType, d.hairType),
      hairColor: pick(HAIR_COLORS, s.hairColor, d.hairColor),
      facialHair: gender === 'male' ? pick(FACIAL_HAIR, s.facialHair, d.facialHair || 'none') : null,
      headCovering: pick(COVERINGS[gender], s.headCovering, gender === d.gender ? d.headCovering : 'none'),
      coveringColor: null,
      glasses: typeof s.glasses === 'boolean' ? s.glasses : d.glasses,
      clothesColor: pick(CLOTHES, s.clothesColor, d.clothesColor),
    };
    if (p.headCovering !== 'none') p.coveringColor = pick(CLOTHES, s.coveringColor, d.coveringColor || p.clothesColor);
    out[id] = p;
  });
  return out;
}

// What goes into localStorage `nabd-avatars-<crewId>`.
export function toSaved(people) {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    people: Object.fromEntries(
      PEOPLE.map((m) => [m.id, { name: m.name, crew: m.crew, child: m.child, ...people[m.id] }]),
    ),
  };
}

// The avatar in words, for screen readers.
export function describe(person, meta) {
  const lower = (list, id) => (findOption(list, id)?.label || '').toLowerCase();
  const parts = [meta.child ? `${person.gender === 'male' ? 'boy' : 'girl'}` : person.gender, `${lower(SKIN, person.skin)} skin`];
  const covering = coveringOf(person);
  if (person.hairType === 'bald') parts.push('bald');
  else if (!hidesHair(person)) {
    const type = person.hairType === 'buzz' ? 'buzz cut' : `${lower(HAIR_TYPES, person.hairType)} hair`;
    parts.push(`${lower(HAIR_COLORS, person.hairColor)} ${type}`);
  }
  if (person.gender === 'male' && person.facialHair && person.facialHair !== 'none') parts.push(lower(FACIAL_HAIR, person.facialHair));
  if (covering && covering.id !== 'none') parts.push(`${lower(CLOTHES, person.coveringColor)} ${covering.label.toLowerCase()}`);
  if (person.glasses) parts.push('glasses');
  parts.push(meta.crew ? `flight suit with a ${lower(CLOTHES, person.clothesColor)} stripe` : `${lower(CLOTHES, person.clothesColor)} shirt`);
  return `Avatar preview for ${meta.name}: ${parts.join(', ')}`;
}
