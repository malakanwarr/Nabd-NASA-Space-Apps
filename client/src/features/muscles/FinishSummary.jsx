// Workout summary (owner: Layal). The side-view twin turns to the front, then the trained muscles grow and
// get greener one by one while their numbers count up, ending with one short, soft burst of small stars
// (a single fade-out, never flashing). With prefers-reduced-motion everything shows in its final state at once.
// Saving already happened in WorkoutPage; this screen only shows the result.
import { useEffect, useState } from 'react';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import Button from '../../shared/Button.jsx';
import ListRow from '../../shared/ListRow.jsx';
import MuscleFigure from './MuscleFigure.jsx';
import WorkoutTwin, { useReducedMotion } from './WorkoutTwin.jsx';
import s from './styles.module.css';

const TURN_MS = 900; // hold the side view briefly, then turn
const STEP_MS = 900; // one muscle after another

function minutesText(seconds) {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} s`;
  return `${Math.round(seconds / 60)} min`;
}

// A number that counts up from `from` to `to` once `active` turns on.
function CountUp({ from, to, active, reduced }) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (!active) return undefined;
    if (reduced) {
      setValue(to);
      return undefined;
    }
    let frame;
    const start = performance.now();
    const loop = (now) => {
      const t = Math.min(1, (now - start) / 800);
      setValue(Math.round(from + (to - from) * t));
      if (t < 1) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [active, from, to, reduced]);
  return <span>{value}</span>;
}

// 12 small four-point stars flying out once from the middle of the twin.
const STARS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const dist = 34 + (i % 3) * 10;
  return { dx: Math.round(Math.cos(angle) * dist), dy: Math.round(Math.sin(angle) * dist), delay: (i % 4) * 60 };
});

function StarBurst() {
  return (
    <svg className={s.burst} viewBox="-60 -60 120 120" aria-hidden="true">
      {STARS.map((st, i) => (
        <path
          key={i}
          className={s.burstStar}
          d="M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z"
          style={{ '--dx': `${st.dx}px`, '--dy': `${st.dy}px`, animationDelay: `${st.delay}ms` }}
        />
      ))}
    </svg>
  );
}

export default function FinishSummary({ summary, gender, person, demoLine, onRetrySave }) {
  const reduced = useReducedMotion();
  const grown = summary.grown;
  const [turned, setTurned] = useState(reduced);
  const [revealed, setRevealed] = useState(reduced ? grown.length : 0);
  const [burst, setBurst] = useState(false);

  // Side view -> front view.
  useEffect(() => {
    if (reduced) return undefined;
    const id = setTimeout(() => setTurned(true), TURN_MS);
    return () => clearTimeout(id);
  }, [reduced]);

  // Then one muscle at a time, then the star burst once.
  useEffect(() => {
    if (reduced || !turned) return undefined;
    if (revealed < grown.length) {
      const id = setTimeout(() => setRevealed((n) => n + 1), revealed === 0 ? 500 : STEP_MS);
      return () => clearTimeout(id);
    }
    if (grown.length && !burst) {
      const id = setTimeout(() => setBurst(true), 400);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [reduced, turned, revealed, grown.length, burst]);

  const shownIds = grown.slice(0, revealed).map((g) => g.id);
  const strength = { ...summary.before };
  shownIds.forEach((id) => {
    strength[id] = summary.after[id];
  });

  return (
    <main className={s.page}>
      <ScreenHeader title={summary.early ? 'Workout ended' : 'Workout done'} />
      {demoLine}
      <p className={s.total}>
        {minutesText(summary.seconds)} worked · {summary.done.length} {summary.done.length === 1 ? 'exercise' : 'exercises'} done
      </p>
      {summary.done.length > 0 && <p className={s.weekLine}>+1 workout this week</p>}

      <div className={`${s.stage} ${s.finishStage}`}>
        {turned ? (
          <div className={reduced ? undefined : s.turnIn}>
            <MuscleFigure
              view="front"
              gender={gender}
              person={person}
              focus={shownIds}
              strength={strength}
              interactive={false}
              label={grown.length ? `Your twin after the workout: ${grown.map((g) => g.name.toLowerCase()).join(', ')} grew` : 'Your twin'}
            />
          </div>
        ) : (
          <div className={s.turnOut}>
            <WorkoutTwin move="rest" tempo={4} getElapsed={() => 0} running={false} label="Your twin" person={person} />
          </div>
        )}
        {burst && !reduced && <StarBurst />}
      </div>

      {grown.length > 0 && (
        <div>
          {grown.map((g, i) => (
            <ListRow
              key={g.id}
              title={g.name}
              right={
                <span className={i < revealed ? s.grownNumber : s.minutes}>
                  {g.from} → <CountUp from={g.from} to={g.to} active={i < revealed} reduced={reduced} />
                </span>
              }
            />
          ))}
        </div>
      )}

      {summary.done.length > 0 ? (
        <div>
          {summary.done.map(({ item, done, sets }) => (
            <ListRow key={item.key} title={item.name} subtitle={sets > 1 ? `${Math.min(done, sets)} of ${sets} sets` : 'Done'} />
          ))}
        </div>
      ) : (
        <p className={s.note}>Nothing was finished, so your twin stays the same. Next time counts.</p>
      )}
      {summary.notCounted.length > 0 && (
        <p className={s.note}>Not counted (fewer than half the sets): {summary.notCounted.map((x) => x.name).join(', ')}.</p>
      )}

      {!summary.saved && (
        <>
          <p className={s.error} role="alert">
            Could not save on this phone.
          </p>
          <div>
            <Button variant="secondary" onClick={onRetrySave}>
              Try again
            </Button>
          </div>
        </>
      )}

      <div className={s.single}>
        <Button to="/body/muscles">Back to your twin</Button>
      </div>
    </main>
  );
}
