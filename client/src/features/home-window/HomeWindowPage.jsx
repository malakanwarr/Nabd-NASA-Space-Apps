// Home window (owner: Habiba). Board 15, route /family/window. Stretch screen.
// Earth at night over Cairo, seen from the ship, the family row, messages from home and "Record a message home".
//
// Prototype limit: the recorded message is not uploaded anywhere (the team plan has no endpoint for it).
// The microphone is used only to show the recording flow, and the audio is thrown away.
import { useEffect, useRef, useState } from 'react';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import ListRow from '../../shared/ListRow.jsx';
import Button from '../../shared/Button.jsx';
import { getSampleData } from '../../shared/sampleData.js';
import { CheckCircleIcon } from '../mood-face/Icons.jsx';
import SavedNote from '../mood-face/SavedNote.jsx';
import { loadWithSavedCopy } from '../mood-face/savedData.js';
import { FROM_HOME_FALLBACK } from './fromHomeSample.js';
import { ImageIcon, MicIcon } from './Icons.jsx';
import s from './styles.module.css';

const MAX_SECONDS = 60;

// "19:40" -> "7:40 pm"
function twelveHour(time) {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
}

function joinNames(names) {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function clock(total) {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function HomeWindowPage() {
  const [data, setData] = useState({ state: 'loading' }); // loading | ready
  const [phase, setPhase] = useState('idle'); // idle | recording | sent | blocked
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef(null);

  useEffect(() => {
    let cancelled = false;
    // from-home.json may not exist yet (then the local fallback is used). If profile AND mission both fail
    // there is no connection: throw, so the copy saved on the phone is used instead.
    loadWithSavedCopy('home-window', async () => {
      const [fromHome, profile, mission] = await Promise.allSettled([
        getSampleData('from-home'),
        getSampleData('profile'),
        getSampleData('mission'),
      ]);
      if (profile.status === 'rejected' && mission.status === 'rejected') throw profile.reason;
      const home = { ...FROM_HOME_FALLBACK, ...(fromHome.status === 'fulfilled' ? fromHome.value : {}) };
      const delay = mission.status === 'fulfilled' ? mission.value.earthDelayOneWay?.minutes : null;
      return {
        home,
        delayMinutes: delay ?? home.delayMinutes,
        family: profile.status === 'fulfilled' ? (profile.value.family ?? []).map((f) => f.name) : [],
      };
    }, ['/api/data/profile', '/api/data/mission'])
      .then(({ data: loaded, saved }) => {
        if (!cancelled) setData({ state: 'ready', saved, ...loaded });
      })
      .catch(() => {
        // Nothing saved and no connection: still show the window, with the local fallback texts.
        if (!cancelled) setData({ state: 'ready', saved: false, home: FROM_HOME_FALLBACK, delayMinutes: FROM_HOME_FALLBACK.delayMinutes, family: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Count the seconds while recording.
  useEffect(() => {
    if (phase !== 'recording') return undefined;
    const timer = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Leaving the page always turns the microphone off.
  useEffect(() => () => recorder.current?.stream?.getTracks().forEach((t) => t.stop()), []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream);
      media.stream = stream;
      recorder.current = media;
      media.start();
      setSeconds(0);
      setPhase('recording');
    } catch {
      setPhase('blocked');
    }
  }

  function stopRecording() {
    const media = recorder.current;
    if (!media) return;
    media.stream.getTracks().forEach((t) => t.stop());
    recorder.current = null;
    setPhase('sent');
  }

  // Stop by itself at the time limit.
  useEffect(() => {
    if (phase === 'recording' && seconds >= MAX_SECONDS) stopRecording();
  });

  if (data.state === 'loading') {
    return (
      <main>
        <ScreenHeader backTo="/family" backLabel="Family" eyebrow="Family" title="Home window" />
        <p className={s.status} role="status">Looking out of the window…</p>
      </main>
    );
  }

  const { home, family, delayMinutes } = data;
  const delayLine = `It reaches ${home.city} in about ${delayMinutes} minutes.`;

  return (
    <main>
      <ScreenHeader backTo="/family" backLabel="Family" eyebrow="Family" title="Home window" />

      {data.saved && <SavedNote />}

      <div className={s.clock}>
        <span className={s.time}>{home.localTime}</span>
        <span className={s.place}>{home.city} · {home.period}</span>
      </div>

      <div className={s.window}>
        <img className={s.earth} src="/images/earth_cairo_night.png" alt={`Earth at night, with the lights of ${home.city}`} />
      </div>

      <h2 className={s.headline}>It's {twelveHour(home.localTime)} at home</h2>
      <p className={s.lead}>Night has fallen over {home.city}. Your family is probably having dinner.</p>

      {family.length > 0 && (
        <ListRow
          to="/family/avatar"
          icon={<span className={s.initials} aria-hidden="true">{family.map((n) => n[0]).join('')}</span>}
          title={joinNames(family)}
          subtitle="Change how you see your family"
          right={<span className={s.chevron} aria-hidden="true">›</span>}
        />
      )}

      <h2 className={s.section}>From home</h2>
      {home.messages.length === 0 ? (
        <p className={s.empty}>No messages yet. Record one for your family.</p>
      ) : (
        home.messages.map((m) => (
          <ListRow
            key={m.id}
            icon={<span className={s.kind}>{m.kind === 'voice' ? <MicIcon /> : <ImageIcon />}</span>}
            title={m.title}
            subtitle={m.when}
          />
        ))
      )}

      <div className={s.record}>
        {phase === 'sent' && (
          <p className={s.sent} role="status">
            <span className={s.sentIcon}><CheckCircleIcon /></span>
            <span>Message recorded. {delayLine}</span>
          </p>
        )}
        {phase === 'blocked' && (
          <p className={s.problem} role="alert">
            The microphone is turned off. Turn it on in Settings › NABD › Permissions, then try again.
          </p>
        )}
        {phase === 'recording' ? (
          <>
            <p className={s.recording} role="status">
              <span className={s.recDot} aria-hidden="true" />
              <span className={s.num}>Recording {clock(seconds)}</span>
            </p>
            <Button onClick={stopRecording}>Stop and send</Button>
          </>
        ) : (
          <Button variant={phase === 'sent' ? 'secondary' : 'primary'} onClick={startRecording}>
            {phase === 'sent' ? 'Record another message' : 'Record a message home'}
          </Button>
        )}
        {phase !== 'sent' && <p className={s.note}>{delayLine}</p>}
      </div>
    </main>
  );
}
