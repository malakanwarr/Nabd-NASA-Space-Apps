// Step 3 of the check-in: the morning sleep questions (owner: Habiba). Route /checkin/sleep.
// The Pollen catch game sends people here, and this page passes the navigation state on to the results.
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../shared/Button.jsx';
import StepProgress from '../../shared/StepProgress.jsx';
import { useSession } from '../../shared/session.js';
import { getSampleData } from '../../shared/sampleData.js';
import { clearDraft } from '../mood-voice/checkinDraft.js';
import SleepQuestionnaire from './SleepQuestionnaire.jsx';
import { readEntries } from './storage.js';
import s from './styles.module.css';

export default function CheckinSleepPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useSession();
  const crewId = session?.id;
  const [today, setToday] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    getSampleData('today')
      .then((t) => alive && setToday(t))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [attempt]);

  // The reaction time (and anything else the game sent) goes on to the results.
  const toResults = () => navigate('/checkin/results', { state: location.state ?? {} });

  const existing = today ? readEntries('sleep', crewId).find((e) => e.missionDay === today.missionDay) ?? null : null;

  return (
    <main>
      <header className={s.stepTop}>
        <Link to="/checkin" className={s.cancel} onClick={clearDraft}>Cancel</Link>
        <StepProgress step={3} total={3} label="Sleep" />
      </header>

      <h1 className={s.sleepTitle}>How did you sleep?</h1>
      <p className={s.muted}>Six quick questions. They finish your sleep score. They stay on this phone.</p>

      {failed && (
        <div className={s.notice} role="alert">
          <p>We couldn't load today's details.</p>
          <Button variant="secondary" onClick={() => { setFailed(false); setAttempt((n) => n + 1); }}>Try again</Button>
          <Button variant="text" onClick={toResults}>Skip to my results</Button>
        </div>
      )}

      {today && (
        <>
          <SleepQuestionnaire
            crewId={crewId}
            missionDay={today.missionDay}
            date={today.date}
            existing={existing}
            submitLabel="See my results"
            onSaved={toResults}
          />
          <div className={s.skip}>
            <Button variant="text" onClick={toResults}>Skip for now</Button>
          </div>
        </>
      )}
    </main>
  );
}
