// Blood pressure (owner: Habiba): history chart and a log for readings taken with proper equipment.
// The phone camera and microphone cannot measure blood pressure, so readings are typed in. Typed readings are
// "self-reported"; the sample history is "simulated".
import { useMemo, useState } from 'react';
import Button from '../../shared/Button.jsx';
import StatusLabel from '../../shared/StatusLabel.jsx';
import NumberField from './NumberField.jsx';
import SourceTag from './SourceTag.jsx';
import TrendChart from './TrendChart.jsx';
import { makeSignal } from './healthModel.js';
import { saveEntry } from './storage.js';
import s from './styles.module.css';

export default function BloodPressureLog({ crewId, today, baseline, history, entries, onSaved }) {
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [problem, setProblem] = useState('');
  const [saved, setSaved] = useState(false);

  const base = baseline.bloodPressure;

  // One reading per day on the chart: a typed reading replaces the sample one for that day.
  const days = useMemo(() => {
    const byDay = new Map();
    history.forEach((d) => d.bloodPressure && byDay.set(d.missionDay, { x: d.missionDay, sys: d.bloodPressure.systolic, dia: d.bloodPressure.diastolic, source: 'simulated' }));
    entries.forEach((e) => byDay.set(e.missionDay, { x: e.missionDay, sys: e.systolic, dia: e.diastolic, source: 'self' }));
    return [...byDay.values()].sort((a, b) => a.x - b.x);
  }, [history, entries]);

  const latestEntry = entries[entries.length - 1] ?? null;
  const latest = latestEntry
    ? { systolic: latestEntry.systolic, diastolic: latestEntry.diastolic, source: 'self', label: `Day ${latestEntry.missionDay}` }
    : { systolic: today.vitals.bloodPressure.systolic, diastolic: today.vitals.bloodPressure.diastolic, source: 'simulated', label: `Day ${today.missionDay}` };
  const status = makeSignal({ id: 'bp', label: 'Blood pressure', value: latest.systolic, baseline: base.systolic, dir: 'up', watchAt: 0.08, actAt: 0.15, source: latest.source })?.status ?? 'stable';

  function submit(event) {
    event.preventDefault();
    const sys = Number(systolic);
    const dia = Number(diastolic);
    if (!systolic || !diastolic) return setProblem('Please enter both numbers.');
    if (!(sys >= 60 && sys <= 250) || !(dia >= 30 && dia <= 150)) return setProblem('These numbers look wrong. Please check them and enter them again.');
    if (sys <= dia) return setProblem('The top number (systolic) should be higher than the bottom number (diastolic).');
    onSaved(saveEntry('bp', crewId, { missionDay: today.missionDay, date: today.date, at: Date.now(), systolic: sys, diastolic: dia }));
    setProblem('');
    setSaved(true);
    setSystolic('');
    setDiastolic('');
  }

  return (
    <section className={s.block} aria-labelledby="bp-title">
      <h2 id="bp-title" className={s.heading}>Blood pressure</h2>
      <p className={s.big}>
        <span className={s.num}>{latest.systolic}/{latest.diastolic}</span>
        <span className={s.muted}> · usual <span className={s.num}>{base.systolic}/{base.diastolic}</span></span>
      </p>
      <p><StatusLabel status={status} /></p>
      <p className={s.meta}><SourceTag kind={latest.source} /> <span className={s.muted}>{latest.label}</span></p>

      <TrendChart
        lines={[
          { id: 'sys', label: 'Systolic', points: days.map((d) => ({ x: d.x, y: d.sys, source: d.source })) },
          { id: 'dia', label: 'Diastolic', points: days.map((d) => ({ x: d.x, y: d.dia, source: d.source })) },
        ]}
        baseline={base.systolic}
      />

      <details className={s.details}>
        <summary>How to measure it</summary>
        <ul className={s.steps}>
          <li>Use the blood pressure equipment that is approved for use on board, and follow its instructions.</li>
          <li>Rest quietly for about 5 minutes first. Keep your arm supported at heart level.</li>
          <li>Take one reading and type both numbers below.</li>
          <li>If a reading stays well above your usual after you rest, tell the crew medical officer.</li>
        </ul>
        <p className={s.caveat}>The phone camera and microphone cannot measure blood pressure or heart rate. Only type in readings from real equipment.</p>
      </details>

      <form className={s.form} onSubmit={submit} noValidate>
        <div className={s.fieldRow}>
          <NumberField label="Top number (systolic)" value={systolic} onChange={(v) => { setSystolic(v); setSaved(false); }} />
          <NumberField label="Bottom number (diastolic)" value={diastolic} onChange={(v) => { setDiastolic(v); setSaved(false); }} />
        </div>
        {problem && <p className={s.problem} role="alert">{problem}</p>}
        {saved && <p className={s.success} role="status">Saved.</p>}
        <Button type="submit" variant="secondary">Save this reading</Button>
      </form>
    </section>
  );
}
