// Make your avatar, /family/avatar (owner: Layal). Stretch screen.
// Sara edits only her own avatar ("you", in the flight suit). Omar, Laila and Mona are always saved with
// their default looks so the Home window can still show the family. Saved on the phone only:
// localStorage `nabd-avatars-<crewId>` (shape: avatarOptions.js toSaved), then on to /family/window.
// Nothing loads from the network, so there is no loading state; with nothing saved, the defaults show.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import Button from '../../shared/Button.jsx';
import Chip from '../../shared/Chip.jsx';
import { useSession } from '../../shared/session.js';
import AvatarFigure from './AvatarFigure.jsx';
import {
  CLOTHES,
  COVERINGS,
  FACIAL_HAIR,
  GENDERS,
  HAIR_COLORS,
  HAIR_TYPES,
  PEOPLE,
  SKIN,
  coveringOf,
  describe,
  hidesHair,
  normalize,
  setCovering,
  setGender,
  toSaved,
} from './avatarOptions.js';
import { readLocal, writeLocal } from './storage.js';
import s from './styles.module.css';

const GLASSES = [
  { id: 'no', label: 'No' },
  { id: 'yes', label: 'Yes' },
];

// Faint stars in the preview, fixed positions (from the board).
const STARS = [
  { cx: 40, cy: 40, r: 1.2 },
  { cx: 300, cy: 60, r: 1 },
  { cx: 320, cy: 200, r: 1.2 },
  { cx: 60, cy: 210, r: 1 },
  { cx: 250, cy: 30, r: 1 },
];

function ChipRow({ title, options, value, onPick, note }) {
  return (
    <section aria-label={title} className={s.section}>
      <h2 className={s.heading}>{title}</h2>
      <div className={s.chips}>
        {options.map((o) => (
          <Chip key={o.id} selected={value === o.id} onClick={() => onPick(o.id)}>
            {o.label}
          </Chip>
        ))}
      </div>
      {note && <p className={s.note}>{note}</p>}
    </section>
  );
}

// Round color buttons: no text inside, so each has an aria-label in words.
function Swatches({ title, options, value, onPick, noun }) {
  return (
    <section aria-label={title} className={s.section}>
      <h2 className={s.heading}>{title}</h2>
      <div className={s.swatches}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`${s.swatch} ${value === o.id ? s.swatchOn : ''}`}
            style={{ background: o.hex }}
            aria-label={`${o.label} ${noun}`}
            aria-pressed={value === o.id}
            onClick={() => onPick(o.id)}
          />
        ))}
      </div>
    </section>
  );
}

export default function AvatarPage() {
  const session = useSession();
  const navigate = useNavigate();
  const storageKey = `nabd-avatars-${session?.id}`;

  // Only her own avatar is edited here.
  const [person, setPerson] = useState(() => normalize(readLocal(storageKey, null)).you);
  const [error, setError] = useState('');

  const meta = PEOPLE.find((m) => m.id === 'you');
  const covering = coveringOf(person);
  const male = person.gender === 'male';

  function update(next) {
    setPerson(next);
    setError('');
  }

  const setField = (field) => (value) => update({ ...person, [field]: value });

  // Same JSON shape as before: her avatar plus the family's default looks.
  function save() {
    if (writeLocal(storageKey, toSaved({ ...normalize(null), you: person }))) navigate('/family/window');
    else setError('Could not save on this phone. Your changes are still here.');
  }

  const hairNote =
    hidesHair(person) && person.hairType !== 'bald' ? `Hidden under the ${covering.label.toLowerCase()}` : '';

  return (
    <main className={s.page}>
      <ScreenHeader backTo="/family/window" backLabel="Home window" title="Make your avatar" />

      <div className={s.preview}>
        <svg className={s.stars} viewBox="0 0 358 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          {STARS.map((st) => (
            <circle key={`${st.cx}-${st.cy}`} cx={st.cx} cy={st.cy} r={st.r} />
          ))}
        </svg>
        <AvatarFigure
          person={person}
          crew={meta.crew}
          child={meta.child}
          label={describe(person, meta)}
          className={s.figure}
          suitClass={s.suitOutline}
        />
        <span className={s.caption}>You, in your flight suit</span>
      </div>

      <ChipRow title="Gender" options={GENDERS} value={person.gender} onPick={(g) => update(setGender(person, g))} />
      <Swatches title="Skin tone" options={SKIN} value={person.skin} onPick={setField('skin')} noun="skin tone" />
      <ChipRow title="Hair type" options={HAIR_TYPES} value={person.hairType} onPick={setField('hairType')} note={hairNote} />
      {person.hairType !== 'bald' && (
        <Swatches title="Hair color" options={HAIR_COLORS} value={person.hairColor} onPick={setField('hairColor')} noun="hair" />
      )}
      {male && <ChipRow title="Facial hair" options={FACIAL_HAIR} value={person.facialHair} onPick={setField('facialHair')} />}
      <ChipRow
        title="Head covering"
        options={COVERINGS[person.gender]}
        value={person.headCovering}
        onPick={(id) => update(setCovering(person, id))}
      />
      {person.headCovering !== 'none' && (
        <Swatches
          title={`${covering.label} color`}
          options={CLOTHES}
          value={person.coveringColor}
          onPick={setField('coveringColor')}
          noun={covering.label.toLowerCase()}
        />
      )}
      <ChipRow
        title="Glasses"
        options={GLASSES}
        value={person.glasses ? 'yes' : 'no'}
        onPick={(id) => update({ ...person, glasses: id === 'yes' })}
      />
      <Swatches
        title="Suit stripe color"
        options={CLOTHES}
        value={person.clothesColor}
        onPick={setField('clothesColor')}
        noun="suit stripe"
      />

      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <div className={s.single}>
        <Button onClick={save}>Save</Button>
      </div>
    </main>
  );
}
