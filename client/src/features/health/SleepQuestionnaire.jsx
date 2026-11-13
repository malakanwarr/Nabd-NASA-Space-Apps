// Morning questionnaire (owner: Habiba): when she slept, how rested she feels. Self-reported, kept on this phone.
import { useState } from 'react';
import Button from '../../shared/Button.jsx';
import Chip from '../../shared/Chip.jsx';
import { saveEntry } from './storage.js';
import s from './styles.module.css';

const SCALE = [1, 2, 3, 4, 5];
const INTERRUPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'one-two', label: '1 or 2' },
  { value: 'three-plus', label: '3 or more' },
];
const FALL_ASLEEP = [
  { value: 'under15', label: 'Under 15 min' },
  { value: '15to30', label: '15 to 30 min' },
  { value: 'over30', label: 'Over 30 min' },
];

function Choice({ legend, children, hint }) {
  return (
    <fieldset className={s.fieldset}>
      <legend className={s.legend}>{legend}</legend>
      {children}
      {hint && <p className={s.hint}>{hint}</p>}
    </fieldset>
  );
}

export default function SleepQuestionnaire({ crewId, missionDay, date, existing, onSaved, submitLabel }) {
  const [bed, setBed] = useState(existing?.bed ?? '23:30');
  const [wake, setWake] = useState(existing?.wake ?? '07:00');
  const [rested, setRested] = useState(existing?.rested ?? null);
  const [interruptions, setInterruptions] = useState(existing?.interruptions ?? null);
  const [fallAsleep, setFallAsleep] = useState(existing?.fallAsleep ?? null);
  const [quality, setQuality] = useState(existing?.quality ?? null);
  const [problem, setProblem] = useState('');
  const [saved, setSaved] = useState(false);

  function submit(event) {
    event.preventDefault();
    if (!bed || !wake) return setProblem('Please add when you went to bed and when you woke up.');
    if (!rested || !quality || !interruptions || !fallAsleep) return setProblem('Please answer all the questions.');
    const list = saveEntry('sleep', crewId, { missionDay, date, at: Date.now(), bed, wake, rested, interruptions, fallAsleep, quality }, 'missionDay');
    setProblem('');
    setSaved(true);
    onSaved(list);
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <div className={s.fieldRow}>
        <label className={s.field}>
          <span className={s.legend}>Went to bed</span>
          <input className={s.input} type="time" value={bed} onChange={(e) => { setBed(e.target.value); setSaved(false); }} />
        </label>
        <label className={s.field}>
          <span className={s.legend}>Woke up</span>
          <input className={s.input} type="time" value={wake} onChange={(e) => { setWake(e.target.value); setSaved(false); }} />
        </label>
      </div>

      <Choice legend="How rested do you feel?" hint="1 is not at all, 5 is fully rested.">
        <div className={s.scale} role="group" aria-label="How rested do you feel, 1 to 5">
          {SCALE.map((n) => (
            <Chip key={n} selected={rested === n} onClick={() => { setRested(n); setSaved(false); }}>{n}</Chip>
          ))}
        </div>
      </Choice>

      <Choice legend="Did anything wake you up?">
        <div className={s.options} role="group" aria-label="Interruptions">
          {INTERRUPTIONS.map((o) => (
            <Chip key={o.value} selected={interruptions === o.value} onClick={() => { setInterruptions(o.value); setSaved(false); }}>{o.label}</Chip>
          ))}
        </div>
      </Choice>

      <Choice legend="How long did it take to fall asleep?">
        <div className={s.options} role="group" aria-label="Time to fall asleep">
          {FALL_ASLEEP.map((o) => (
            <Chip key={o.value} selected={fallAsleep === o.value} onClick={() => { setFallAsleep(o.value); setSaved(false); }}>{o.label}</Chip>
          ))}
        </div>
      </Choice>

      <Choice legend="How was your sleep overall?" hint="1 is very poor, 5 is very good.">
        <div className={s.scale} role="group" aria-label="Sleep quality, 1 to 5">
          {SCALE.map((n) => (
            <Chip key={n} selected={quality === n} onClick={() => { setQuality(n); setSaved(false); }}>{n}</Chip>
          ))}
        </div>
      </Choice>

      {problem && <p className={s.problem} role="alert">{problem}</p>}
      {saved && <p className={s.success} role="status">Saved. These answers are used for today.</p>}
      <Button type="submit">{submitLabel ?? (existing || saved ? 'Update my answers' : 'Save my answers')}</Button>
    </form>
  );
}
