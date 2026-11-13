// Make your avatar, /family/avatar (owner: Layal). Stretch screen.
// Sara can edit each family avatar. Omar, Laila and Mona start with their default looks. Saved on the phone only:
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

  const [people, setPeople] = useState(() => normalize(readLocal(storageKey, null)));
  const [selectedId, setSelectedId] = useState('you');
  const [error, setError] = useState('');

  const selectedMeta = PEOPLE.find((meta) => meta.id === selectedId) || PEOPLE[0];
  const person = people[selectedMeta.id];
  const covering = coveringOf(person);
  const male = person.gender === 'male';

  function update(next) {
    setPeople((current) => ({ ...current, [selectedMeta.id]: next }));
    setError('');
  }

  const setField = (field) => (value) => update({ ...person, [field]: value });

  function save() {
    if (writeLocal(storageKey, toSaved(people))) navigate('/family/window');
    else setError('Could not save on this phone. Your changes are still here.');
  }

  const hairNote =
    hidesHair(person) && person.hairType !== 'bald' ? `Hidden under the ${covering.label.toLowerCase()}` : '';

  return (
    <main className={s.page}>
      <ScreenHeader
        backTo="/family/window"
        backLabel="Home window"
        title={selectedMeta.id === 'you' ? 'Make your avatar' : `Edit ${selectedMeta.name}'s avatar`}
      />

      <section className={s.family} aria-label="Family avatars">
        <h2 className={s.heading}>Your family</h2>
        <div className={s.avatarGrid}>
          {PEOPLE.map((meta) => (
            <figure className={s.avatarCard} key={meta.id}>
              <div className={s.preview}>
                <svg className={s.stars} viewBox="0 0 358 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                  {STARS.map((st) => (
                    <circle key={`${st.cx}-${st.cy}`} cx={st.cx} cy={st.cy} r={st.r} />
                  ))}
                </svg>
                <AvatarFigure
                  person={people[meta.id]}
                  crew={meta.crew}
                  child={meta.child}
                  label={describe(people[meta.id], meta)}
                  className={s.figure}
                  suitClass={s.suitOutline}
                />
              </div>
              <figcaption className={s.caption}>
                <Chip selected={selectedId === meta.id} onClick={() => setSelectedId(meta.id)}>
                  {meta.id === 'you' ? 'You' : meta.name}
                </Chip>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

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
        title={selectedMeta.crew ? 'Suit stripe color' : 'Shirt color'}
        options={CLOTHES}
        value={person.clothesColor}
        onPick={setField('clothesColor')}
        noun={selectedMeta.crew ? 'suit stripe' : 'shirt'}
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
