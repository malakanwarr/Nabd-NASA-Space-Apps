// Log a symptom, /body/cycle/log (owner: Layal). PRIVATE. A 3-step page, never a pop-up:
//   1 Where (body area), 2 What (symptom chips), 3 How strong (1–10) and since when.
// Saves with POST /api/womens/log { crewId, date, area, symptoms, strength, notes }; "since when" goes into notes.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import StepProgress from '../../shared/StepProgress.jsx';
import Button from '../../shared/Button.jsx';
import Chip from '../../shared/Chip.jsx';
import { apiFetch } from '../../shared/api.js';
import { useSession } from '../../shared/session.js';
import { todayIso } from './helpers.js';
import s from './styles.module.css';

const AREAS = ['Head', 'Chest', 'Upper belly', 'Lower belly', 'Lower back', 'Legs'];
const SYMPTOMS = ['Cramps', 'Back pain', 'Bloating', 'Spotting', 'Tiredness', 'Headache', 'Something else'];
const SINCE = ['A few hours', '1 day', '2 days', '3 days', 'A week or more'];
const OTHER = 'Something else';

const STEPS = [
  { label: 'Where', title: 'Where do you feel it?', next: 'Next: what you feel', missing: 'Pick where you feel it.' },
  { label: 'What', title: 'What do you feel?', next: 'Next: how strong', missing: 'Pick at least one.' },
  { label: 'How strong', title: 'How strong is it?', next: 'Save', missing: 'Pick since when.' },
];

// Highlight shapes on the body figure, one per area (figure coordinates, not CSS pixels).
const SPOTS = {
  Head: [{ cx: 48, cy: 18, rx: 11, ry: 11 }],
  Chest: [{ cx: 48, cy: 54, rx: 18, ry: 10 }],
  'Upper belly': [{ cx: 48, cy: 74, rx: 18, ry: 9 }],
  'Lower belly': [{ cx: 48, cy: 90, rx: 20, ry: 13 }],
  'Lower back': [{ cx: 48, cy: 100, rx: 24, ry: 6 }],
  Legs: [
    { cx: 33, cy: 140, rx: 7, ry: 30 },
    { cx: 63, cy: 140, rx: 7, ry: 30 },
  ],
};

function BodyFigure({ area }) {
  return (
    <svg className={s.figure} viewBox="0 0 96 180" role="img" aria-label={area ? `${area} selected` : 'No body area selected yet'}>
      <circle className={s.figureBody} cx="48" cy="18" r="14" strokeWidth="2" />
      <path className={s.figureBody} d="M26 38 Q48 32 70 38 L74 104 Q48 110 22 104 Z" strokeWidth="2" />
      <path className={s.figureLimb} d="M26 40 L12 98 M70 40 L84 98" strokeWidth="8" />
      <path className={s.figureLimb} d="M34 106 L32 174 M62 106 L64 174" strokeWidth="10" />
      {(SPOTS[area] || []).map((p) => (
        <ellipse key={`${p.cx}-${p.cy}`} className={s.figureSpot} {...p} />
      ))}
    </svg>
  );
}

function DangerHint() {
  return (
    <p className={s.danger}>
      <svg className={s.dangerIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M12 3 2 20h20z" />
        <path d="M12 10v4M12 17v.5" />
      </svg>
      <span>
        Heavy bleeding, severe pain or swelling in one leg?{' '}
        <Link to="/doctor" className={s.dangerLink}>
          Get help now
        </Link>
      </span>
    </p>
  );
}

export default function LogSymptomPage() {
  const session = useSession();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [area, setArea] = useState('');
  const [symptoms, setSymptoms] = useState([]);
  const [otherText, setOtherText] = useState('');
  const [strength, setStrength] = useState(5);
  const [since, setSince] = useState('');
  const [hint, setHint] = useState('');
  const [save, setSave] = useState({ saving: false, error: '' });

  const current = STEPS[step - 1];

  function toggleSymptom(name) {
    setHint('');
    setSymptoms((list) => (list.includes(name) ? list.filter((x) => x !== name) : [...list, name]));
  }

  function stepIsComplete() {
    if (step === 1) return Boolean(area);
    if (step === 2) return symptoms.length > 0;
    return Boolean(since);
  }

  async function submit() {
    setSave({ saving: true, error: '' });
    // "Something else" is saved as what she typed, if she typed anything.
    const words = symptoms.map((x) => (x === OTHER && otherText.trim() ? otherText.trim() : x));
    try {
      await apiFetch('/api/womens/log', {
        method: 'POST',
        body: {
          crewId: session?.id,
          date: todayIso(),
          area,
          symptoms: words,
          strength,
          notes: `Since: ${since}`,
        },
      });
      navigate('/body/cycle', { state: { saved: true } });
    } catch (err) {
      setSave({ saving: false, error: err.message });
    }
  }

  function next() {
    if (!stepIsComplete()) {
      setHint(current.missing);
      return;
    }
    setHint('');
    if (step < STEPS.length) setStep(step + 1);
    else submit();
  }

  function back() {
    setHint('');
    setSave({ saving: false, error: '' });
    setStep(step - 1);
  }

  return (
    <main className={s.logPage}>
      <div className={s.top}>
        <ScreenHeader backTo="/body/cycle" backLabel="Cycle" title={current.title} />
        <StepProgress step={step} total={STEPS.length} label={current.label} />
      </div>

      {step === 1 && (
        <section aria-label="Body area" className={`${s.areaPicker} ${s.rise}`}>
          <BodyFigure area={area} />
          <div className={s.areaGrid}>
            {AREAS.map((name) => (
              <Chip
                key={name}
                selected={area === name}
                onClick={() => {
                  setHint('');
                  setArea(name);
                }}
              >
                {name}
              </Chip>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section aria-label="What do you feel" className={`${s.section} ${s.rise}`}>
          <p className={s.lead}>Pick all that fit. You add how strong and since when next.</p>
          <div className={s.chips}>
            {SYMPTOMS.map((name) => (
              <Chip key={name} selected={symptoms.includes(name)} onClick={() => toggleSymptom(name)}>
                {name}
              </Chip>
            ))}
          </div>
          {symptoms.includes(OTHER) && (
            <label className={s.field}>
              <span className={s.label}>What else do you feel?</span>
              <input
                className={s.textInput}
                type="text"
                maxLength={60}
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="For example: nausea"
              />
            </label>
          )}
        </section>
      )}

      {step === 3 && (
        <section aria-label="How strong and since when" className={`${s.section} ${s.rise}`}>
          <label className={s.field}>
            <span className={s.label}>
              Strength: {strength} of 10
            </span>
            <input
              className={s.slider}
              type="range"
              min="1"
              max="10"
              step="1"
              value={strength}
              onChange={(e) => setStrength(Number(e.target.value))}
              aria-valuetext={`${strength} of 10`}
            />
            <span className={s.sliderEnds} aria-hidden="true">
              <span>1 · Mild</span>
              <span>10 · Worst</span>
            </span>
          </label>

          <div className={s.field} role="group" aria-label="Since when">
            <span className={s.label}>Since when?</span>
            <div className={s.chips}>
              {SINCE.map((name) => (
                <Chip
                  key={name}
                  selected={since === name}
                  onClick={() => {
                    setHint('');
                    setSince(name);
                  }}
                >
                  {name}
                </Chip>
              ))}
            </div>
          </div>
        </section>
      )}

      <DangerHint />

      {(hint || save.error) && (
        <p role="alert" className={s.error}>
          {save.error ? `Could not save. ${save.error}` : hint}
        </p>
      )}

      <div className={`${s.bottomBar} ${step === 1 ? s.bottomBarSingle : ''}`}>
        {step > 1 && (
          <Button variant="secondary" onClick={back} disabled={save.saving}>
            Back
          </Button>
        )}
        <Button onClick={next} disabled={save.saving} aria-busy={save.saving}>
          {save.saving ? 'Saving…' : save.error && step === STEPS.length ? 'Try again' : current.next}
        </Button>
      </div>
    </main>
  );
}
