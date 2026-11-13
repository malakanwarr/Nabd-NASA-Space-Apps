// Check-in: before you start (owner: Habiba). Board 7, route /checkin.
// "Allow camera and mic, then start" asks the phone for permission, then opens /checkin/record.
// "Voice only today" opens /checkin/record in voice-only mode: navigation state { mode: 'voice' }.
// The face path sends { mode: 'face', permitted: true }.)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import ListRow from '../../shared/ListRow.jsx';
import Button from '../../shared/Button.jsx';
import { apiFetch } from '../../shared/api.js';
import { getSampleData } from '../../shared/sampleData.js';
import { useSession } from '../../shared/session.js';
import SavedNote from './SavedNote.jsx';
import { loadWithSavedCopy } from './savedData.js';
import { CheckCircleIcon, LockIcon, PhoneIcon, QuietIcon, SunIcon } from './Icons.jsx';
import s from './styles.module.css';

export default function CheckinStartPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [missionDay, setMissionDay] = useState(null);
  const [doneToday, setDoneToday] = useState(false);
  const [fromSaved, setFromSaved] = useState(false);
  const [asking, setAsking] = useState(false);

  // Today's mission day and "already checked in today?": GET /api/mood returns her last 7 check-ins, one per
  // mission day. With no connection we use the copy saved on the phone, but only if it is from today.
  useEffect(() => {
    if (!session?.id) return undefined;
    let cancelled = false;
    loadWithSavedCopy(`checkin-${session.id}`, async () => {
      const [today, list] = await Promise.all([
        getSampleData('today'),
        apiFetch(`/api/mood?crewId=${encodeURIComponent(session.id)}`),
      ]);
      return { missionDay: today.missionDay, doneToday: Array.isArray(list) && list.some((c) => c.missionDay === today.missionDay) };
    }, ['/api/data/today', `/api/mood?crewId=${encodeURIComponent(session.id)}`])
      .then(({ data, saved, at }) => {
        if (cancelled) return;
        const sameDay = !saved || new Date(at).toDateString() === new Date().toDateString();
        setMissionDay(data.missionDay);
        setDoneToday(sameDay && data.doneToday);
        setFromSaved(saved);
      })
      .catch(() => {}); // no day number and no banner: the screen still works
    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  // The tap is what lets the phone ask. We stop the test stream at once; the record page opens the camera itself.
  async function allowAndStart() {
    setAsking(true);
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const test = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
        test.getTracks().forEach((t) => t.stop());
      }
    } catch {
      // Blocked or no camera: the record page shows the "We can't see your face" state with next steps.
    }
    setAsking(false);
    navigate('/checkin/record', { state: { mode: 'face', permitted: true } });
  }

  return (
    <main>
      <ScreenHeader eyebrow={missionDay ? `Daily · Day ${missionDay}` : 'Daily'} title="Today's check-in" />
      <p className={s.lead}>About 4 minutes · 2 steps</p>
      {fromSaved && <SavedNote />}

      {doneToday && (
        <p className={s.checkedIn} role="status">
          <span className={s.checkedInIcon}><CheckCircleIcon /></span>
          <span>
            <strong>You've already checked in today.</strong> Checking in again replaces today's result.
          </span>
        </p>
      )}

      <ListRow
        icon={<span className={s.stepIcon}>1</span>}
        title="Face and voice · 30 seconds"
        subtitle="Read one sentence out loud twice while the camera and mic run."
      />
      <ListRow
        icon={<span className={s.stepIcon}>2</span>}
        title="Pollen catch · 3 minutes"
        subtitle="A quick reaction game, based on NASA's vigilance test."
      />

      <h2 className={s.sectionTitle}>Before you start</h2>
      <ul className={s.tips}>
        <li className={s.tip}><SunIcon /> Face a light, not a window</li>
        <li className={s.tip}><PhoneIcon /> Hold the phone at eye level</li>
        <li className={s.tip}><QuietIcon /> Find a quiet spot</li>
      </ul>

      {/* One line in our own words. Source for Layal's data log: NASA Human Research Program, Behavioral Changes risk. */}
      <p className={s.why}>
        NASA research on long missions shows that mood and alertness can change slowly, so a short daily check-in helps you notice early.
      </p>

      <p className={s.privacy}>
        <LockIcon />
        <span>Video and audio never leave your phone. Only numbers, like your blink rate, are saved. Your phone will ask once for camera and microphone access.</span>
      </p>

      <div className={s.startActions}>
        {doneToday && <Button to="/checkin/results">See today's results</Button>}
        <Button variant={doneToday ? 'secondary' : 'primary'} onClick={allowAndStart} disabled={asking}>
          {asking ? 'Waiting for your phone…' : doneToday ? 'Check in again' : 'Allow camera and mic, then start'}
        </Button>
        <Button variant="text" to="/checkin/record" state={{ mode: 'voice' }}>
          Voice only today
        </Button>
      </div>
    </main>
  );
}
