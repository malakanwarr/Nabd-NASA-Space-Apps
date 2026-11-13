// Health profile (owner: Habiba). Route /health. Four separate views of how the astronaut is today,
// each compared with her own baseline. There is no single score on purpose.
import { useMemo } from 'react';
import Button from '../../shared/Button.jsx';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import { useSession } from '../../shared/session.js';
import SavedNote from '../mood-face/SavedNote.jsx';
import DimensionCard from './DimensionCard.jsx';
import SourceTag from './SourceTag.jsx';
import { buildProfile } from './healthModel.js';
import { readEntries } from './storage.js';
import useHealthData from './useHealthData.js';
import s from './styles.module.css';

export default function HealthPage() {
  const session = useSession();
  const { state, retry } = useHealthData(session?.id);

  const profile = useMemo(() => {
    if (state.phase !== 'ready') return null;
    return buildProfile({
      today: state.today,
      baseline: state.baseline,
      history: state.history,
      reactionTests: state.reactionTests,
      checkins: state.checkins,
      sleepEntries: readEntries('sleep', session?.id),
    });
  }, [state, session?.id]);

  return (
    <main>
      <ScreenHeader backTo="/" backLabel="Home" eyebrow={profile ? `Day ${profile.missionDay}` : 'Health'} title="Health profile" />

      {state.phase === 'loading' && <p className={s.muted} role="status">Loading your health profile…</p>}

      {state.phase === 'error' && (
        <div className={s.notice} role="alert">
          <p>{state.message}</p>
          <Button variant="secondary" onClick={retry}>Try again</Button>
        </div>
      )}

      {profile && (
        <>
          {state.saved && <SavedNote />}
          <p className={s.lead}>
            Four separate views of how you are. There is no single score on purpose: each one is compared with your own normal,
            and each says where its numbers come from.
          </p>
          {!profile.checkinIsToday && (
            <p className={s.notice} role="status">You have not checked in today. Cognitive and emotional views use your latest check-in.</p>
          )}

          <div className={s.cards}>
            {profile.dimensions.map((dimension) => (
              <DimensionCard key={dimension.id} dimension={dimension} />
            ))}
          </div>

          <section className={s.block} aria-labelledby="legend-title">
            <h2 id="legend-title" className={s.heading}>How to read the labels</h2>
            <ul className={s.legendList}>
              <li><SourceTag kind="measured" /> <span className={s.muted}>Taken by this phone just now or in your check-in.</span></li>
              <li><SourceTag kind="self" /> <span className={s.muted}>You told us.</span></li>
              <li><SourceTag kind="estimated" /> <span className={s.muted}>Worked out from other numbers. A guess, not a measurement.</span></li>
            </ul>
            <p className={s.muted}>
              The phone camera and microphone cannot measure heart rate or blood pressure. This is not a diagnosis, and the
              limits we use are prototype values that have not been clinically tested.
            </p>
          </section>

        </>
      )}
    </main>
  );
}
