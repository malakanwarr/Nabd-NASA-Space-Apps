// Today's workout card on the muscle twin page (owner: Layal). Shows the plan from todaysWorkout.js:
// why chips (focus, energy, cycle), the exercises with sets and minutes, and "Start with your twin"
// (the workout mode comes next; for now it says "Coming soon").
import { useState } from 'react';
import Button from '../../shared/Button.jsx';
import ListRow from '../../shared/ListRow.jsx';
import s from './styles.module.css';

export default function TodaysWorkout({ status, workout, cycleError, onRetry }) {
  const [soon, setSoon] = useState(false);

  return (
    <section className={s.workout} aria-labelledby="todays-workout-title">
      <h2 id="todays-workout-title" className={s.workoutTitle}>
        Today's workout
      </h2>

      {status === 'loading' && (
        <p className={s.note} role="status">
          Building today's workout…
        </p>
      )}

      {status === 'error' && (
        <>
          <p className={s.error} role="alert">
            Today's workout can't load right now.
          </p>
          <div>
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          </div>
        </>
      )}

      {status === 'ready' && workout && (
        <>
          <ul className={s.reasons} aria-label="Why this workout">
            {workout.reasons.map((r) => (
              <li key={r.kind} className={s.reason}>
                {r.text}
              </li>
            ))}
          </ul>

          <div>
            {workout.exercises.map((e) => (
              <ListRow
                key={e.key}
                title={e.name}
                subtitle={`${e.dose} · ${e.detail}`}
                right={<span className={s.minutes}>{e.minutes} min</span>}
              />
            ))}
          </div>
          <p className={s.total}>About {workout.totalMinutes} min</p>
          {cycleError && <p className={s.note}>Cycle data unavailable, no cycle change today.</p>}

          <div className={s.single}>
            <Button onClick={() => setSoon(true)}>Start with your twin</Button>
          </div>
          {soon && (
            <p className={s.note} role="status">
              Coming soon
            </p>
          )}
        </>
      )}
    </section>
  );
}
