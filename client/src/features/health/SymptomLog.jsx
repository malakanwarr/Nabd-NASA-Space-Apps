// Fluid-shift symptoms (owner: Habiba). She records how she feels, when she wants to. Shown as a trend, never a diagnosis.
// A change in vision or a strong symptom shows a clear "tell the crew medical officer" message.
import { useMemo, useState } from 'react';
import Button from '../../shared/Button.jsx';
import Chip from '../../shared/Chip.jsx';
import StatusLabel from '../../shared/StatusLabel.jsx';
import SourceTag from './SourceTag.jsx';
import TrendChart from './TrendChart.jsx';
import { SIMULATED_SYMPTOMS } from './simulatedData.js';
import { saveEntry } from './storage.js';
import s from './styles.module.css';

const SYMPTOMS = [
  { id: 'puffiness', label: 'Facial puffiness' },
  { id: 'fullness', label: 'Head fullness' },
  { id: 'congestion', label: 'Nasal congestion' },
  { id: 'vision', label: 'Change in vision' },
];
const LEVELS = ['None', 'Mild', 'Moderate', 'Strong'];
const EMPTY = { puffiness: 0, fullness: 0, congestion: 0, vision: 0 };
const total = (levels) => SYMPTOMS.reduce((sum, x) => sum + (levels[x.id] || 0), 0);

export default function SymptomLog({ crewId, today, entries, onSaved }) {
  const [levels, setLevels] = useState(EMPTY);
  const [saved, setSaved] = useState(false);

  const days = useMemo(() => {
    const byDay = new Map();
    SIMULATED_SYMPTOMS.forEach((e) => byDay.set(e.missionDay, { x: e.missionDay, y: total(e.levels), source: 'simulated' }));
    entries.forEach((e) => byDay.set(e.missionDay, { x: e.missionDay, y: total(e.levels), source: 'self' }));
    return [...byDay.values()].sort((a, b) => a.x - b.x);
  }, [entries]);

  const latest = entries[entries.length - 1] ?? null;
  const strong = latest && SYMPTOMS.some((x) => latest.levels[x.id] === 3);
  const vision = latest && latest.levels.vision >= 1;

  function submit(event) {
    event.preventDefault();
    onSaved(saveEntry('symptoms', crewId, { missionDay: today.missionDay, date: today.date, at: Date.now(), levels }, 'missionDay'));
    setSaved(true);
    setLevels(EMPTY);
  }

  return (
    <section className={s.block} aria-labelledby="sym-title">
      <h2 id="sym-title" className={s.heading}>Fluid-shift symptoms</h2>
      <p className={s.muted}>
        In space, body fluids shift toward the head. You can note how you feel when you want to. This shows how things change over time. It is not a diagnosis.
      </p>

      {strong && (
        <div className={s.alertBox} role="alert">
          <StatusLabel status="act" />
          <p><strong>You noted a strong symptom.</strong> Tell the crew medical officer now. Do not wait.</p>
          <Button to="/doctor">Talk to the AI doctor now</Button>
        </div>
      )}
      {!strong && vision && (
        <div className={s.alertBox} role="alert">
          <StatusLabel status="watch" />
          <p><strong>You noted a change in vision.</strong> Tell the crew medical officer today, even if it is mild.</p>
          <Button to="/doctor" variant="secondary">Open the AI doctor</Button>
        </div>
      )}

      <p className={s.seriesLabel}>Total symptom level (higher means more or stronger symptoms)</p>
      <TrendChart lines={[{ id: 'load', label: 'Total symptom level', points: days }]} />
      {entries.length > 0 && <p className={s.meta}><SourceTag kind="self" /></p>}

      {latest && (
        <p className={s.muted}>
          Your last note, day {latest.missionDay}:{' '}
          {SYMPTOMS.filter((x) => latest.levels[x.id] > 0).map((x) => `${x.label.toLowerCase()} (${LEVELS[latest.levels[x.id]].toLowerCase()})`).join(', ') || 'no symptoms'}.
        </p>
      )}

      <details className={s.details}>
        <summary>Add how you feel today</summary>
        <form className={s.form} onSubmit={submit}>
          <p className={s.hint}>Mild: you notice it. Moderate: it bothers you. Strong: you cannot ignore it.</p>
          {SYMPTOMS.map((x) => (
            <fieldset key={x.id} className={s.fieldset}>
              <legend className={s.legend}>{x.label}</legend>
              <div className={s.levels} role="group" aria-label={x.label}>
                {LEVELS.map((word, level) => (
                  <Chip key={word} selected={levels[x.id] === level} onClick={() => { setLevels({ ...levels, [x.id]: level }); setSaved(false); }}>
                    {word}
                  </Chip>
                ))}
              </div>
            </fieldset>
          ))}
          {saved && <p className={s.success} role="status">Saved.</p>}
          <Button type="submit" variant="secondary">Save how I feel</Button>
        </form>
      </details>
    </section>
  );
}
