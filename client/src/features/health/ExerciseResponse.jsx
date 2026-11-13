// Exercise response (owner: Habiba): heart rate before, at the peak, and 2 minutes after a workout, and how it changes
// over workouts. It is recorded by itself when a workout finishes (see workoutHeart.js). Nothing is typed in.
import { useMemo } from 'react';
import Button from '../../shared/Button.jsx';
import SourceTag from './SourceTag.jsx';
import TrendChart from './TrendChart.jsx';
import { SIMULATED_EXERCISE } from './simulatedData.js';
import s from './styles.module.css';

export default function ExerciseResponse({ entries }) {
  const sessions = useMemo(
    () =>
      [
        ...SIMULATED_EXERCISE.map((x) => ({ ...x, source: 'simulated' })),
        ...entries.map((x) => ({ ...x, source: x.source ?? 'sensor' })),
      ]
        .map((x) => ({ ...x, drop: x.hrPeak - x.hrAfter2 }))
        .sort((a, b) => a.missionDay - b.missionDay || (a.at ?? 0) - (b.at ?? 0)),
    [entries],
  );

  const first = sessions[0];
  const last = sessions[sessions.length - 1];

  return (
    <section className={s.block} aria-labelledby="ex-title">
      <h2 id="ex-title" className={s.heading}>Exercise response</h2>
      <p className={s.muted}>
        Your heart sensor tracks your heart rate during a workout. NABD keeps it from before you start, at your peak, and 2 minutes after you finish. A
        bigger drop means your heart rate came down more.
      </p>

      <p className={s.seriesLabel}>Heart rate drop after exercise (bpm)</p>
      <TrendChart lines={[{ id: 'drop', label: 'Heart rate drop', points: sessions.map((x) => ({ x: x.missionDay, y: x.drop, source: x.source })) }]} />
      {first && last && first !== last && (
        <p className={s.muted}>
          Across {sessions.length} workouts your drop went from <span className={s.num}>{first.drop} bpm</span> to <span className={s.num}>{last.drop} bpm</span>.
          Ask the crew medical officer what a change like this means for you.
        </p>
      )}
      {entries.length > 0 && <p className={s.meta}><SourceTag kind="sensor" /></p>}

      <h3 className={s.subheading}>Exercise history</h3>
      <ul className={s.rows}>
        {[...sessions].reverse().slice(0, 5).map((x) => (
          <li key={`${x.missionDay}-${x.at ?? 'earlier'}`} className={s.row}>
            <span>Day {x.missionDay}{x.minutes ? ` · ${x.minutes} min` : ''}</span>
            <span className={s.muted}>
              <span className={s.num}>{x.hrBefore}</span> before · <span className={s.num}>{x.hrPeak}</span> peak · <span className={s.num}>{x.hrAfter2}</span> after
            </span>
          </li>
        ))}
      </ul>

      <div className={s.after}>
        <Button variant="secondary" to="/body/muscles">Start today's workout</Button>
      </div>
      <p className={s.caveat}>Stop exercising and tell the crew medical officer if you have chest pain, dizziness or unusual breathlessness.</p>
    </section>
  );
}
