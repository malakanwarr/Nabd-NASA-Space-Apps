// Check-in: before you start (owner: Habiba). Board 7, route /checkin.
// "Allow camera and mic, then start" asks the phone for permission, then opens /checkin/record.
// "Voice only today" opens /checkin/record in voice-only mode: navigation state { mode: 'voice' }.
// (Agree this signal with Malak. The face path sends { mode: 'face', permitted: true }.)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import ListRow from '../../shared/ListRow.jsx';
import Button from '../../shared/Button.jsx';
import { getSampleData } from '../../shared/sampleData.js';
import { LockIcon, PhoneIcon, QuietIcon, SunIcon } from './Icons.jsx';
import s from './styles.module.css';

export default function CheckinStartPage() {
  const navigate = useNavigate();
  const [missionDay, setMissionDay] = useState(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSampleData('today')
      .then((today) => {
        if (!cancelled) setMissionDay(today.missionDay);
      })
      .catch(() => {}); // no day number is fine: the screen still works
    return () => {
      cancelled = true;
    };
  }, []);

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

      <ListRow
        icon={<span className={s.stepIcon}>1</span>}
        title="Face and voice · 30 seconds"
        subtitle="Read one sentence out loud while the camera and mic run."
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
        <Button onClick={allowAndStart} disabled={asking}>
          {asking ? 'Waiting for your phone…' : 'Allow camera and mic, then start'}
        </Button>
        <Button variant="text" to="/checkin/record" state={{ mode: 'voice' }}>
          Voice only today
        </Button>
      </div>
    </main>
  );
}
