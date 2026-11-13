import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import Button from '../../shared/Button.jsx';
import ListRow from '../../shared/ListRow.jsx';
import { getSampleData } from '../../shared/sampleData.js';
import { useNewHugs } from './useNewHugs.js';
import { buzzThreeTimes } from './buzz.js';
import { weeklyCounts } from './hugCounts.js';
import HeartRipple, { HeartIcon } from './HeartRipple.jsx';
import s from './styles.module.css';

// The sample hugs have no clock time, so the board's "2 min ago" is the only wording for them.
const SAMPLE_ARRIVED = 'Arrived 2 min ago';

function newestSampleHug(list = []) {
  let best = null;
  for (const h of list) if (!best || (h.missionDay ?? 0) >= (best.missionDay ?? 0)) best = h;
  return best;
}

function arrivedText(createdAt, now) {
  const minutes = Math.floor((now - new Date(createdAt).getTime()) / 60000);
  if (minutes < 1) return 'Arrived just now';
  return `Arrived ${minutes} min ago`;
}

function LockIcon() {
  return (
    <svg
      className={s.smallIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function WindowIcon() {
  return (
    <svg
      className={s.rowIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M12 4v16M4 12h16" />
    </svg>
  );
}

export default function FamilyPage() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [playKey, setPlayKey] = useState(0);
  const [buzzed, setBuzzed] = useState(false);
  const [note, setNote] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const noteTimer = useRef(null);

  const onHug = useCallback(() => {
    setBuzzed(Boolean(buzzThreeTimes()));
    setPlayKey((k) => k + 1);
  }, []);
  const { hugs: liveHugs, offline } = useNewHugs({ onHug });

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    Promise.all([getSampleData('hugs'), getSampleData('profile'), getSampleData('mission')])
      .then(([hugs, profile, mission]) => {
        if (!cancelled) setData({ hugs, profile, mission });
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Keeps "Arrived N min ago" honest for live hugs.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => clearTimeout(noteTimer.current), []);

  const showNote = (text) => {
    setNote(text);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(''), 2500);
  };

  const rows = useMemo(
    () => (data ? weeklyCounts(data.hugs.thisWeek, liveHugs, data.profile.family) : []),
    [data, liveHugs],
  );

  if (loadError) {
    return (
      <main className={s.page}>
        <ScreenHeader title="Family" />
        <div className={s.stateBox} role="alert">
          <p className={s.stateText}>
            Couldn't load your family. Check the connection and try again.
          </p>
          <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </Button>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className={s.page}>
        <ScreenHeader title="Family" />
        <p className={s.stateText} role="status">
          Loading your family…
        </p>
      </main>
    );
  }

  const { hugs, profile, mission } = data;
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const max = Math.max(1, ...rows.map((r) => r.count));
  const latestLive = liveHugs[liveHugs.length - 1];
  const latestSample = newestSampleHug(hugs.thisWeek);
  const hero = latestLive
    ? {
        from: latestLive.from,
        text: `${arrivedText(latestLive.createdAt, now)}${buzzed ? ' · your phone buzzed' : ''}`,
      }
    : latestSample
      ? { from: latestSample.from, text: `${SAMPLE_ARRIVED} · your phone buzzed` }
      : null;
  const homeCity = String(profile.hometown ?? '').split(',')[0] || 'home';
  const shared = hugs.sharedWithFamilyNow;

  return (
    <main className={s.page}>
      <ScreenHeader title="Family" />
      <p className={s.lead}>Hugs take {mission.earthDelayOneWay.text} to travel between you</p>

      {offline && (
        <p className={s.offline} role="status">
          <strong>Offline.</strong> Can't check for new hugs right now. Trying again.
        </p>
      )}

      {hero ? (
        <section className={s.hero} aria-label="Latest hug" aria-live="polite">
          <span className={s.heroHeart}>
            <HeartRipple playKey={playKey} />
            <HeartIcon className={s.heroHeartIcon} />
          </span>
          <div>
            <p className={s.heroTitle}>{hero.from} sent you a hug</p>
            <p className={s.heroSub}>{hero.text}</p>
          </div>
        </section>
      ) : (
        <section className={s.hero} aria-label="Latest hug">
          <span className={s.heroHeart}>
            <HeartIcon className={s.heroHeartIcon} />
          </span>
          <div>
            <p className={s.heroTitle}>No hugs yet this week</p>
            <p className={s.heroSub}>When someone sends one, it shows up here.</p>
          </div>
        </section>
      )}

      <section aria-labelledby="week-title">
        <h2 id="week-title" className={s.sectionTitle}>
          {total} {total === 1 ? 'hug' : 'hugs'} this week
        </h2>
        <ul className={s.bars}>
          {rows.map((r) => (
            <li key={r.name} className={s.barRow}>
              <span className={s.barName}>
                {r.name}
                {r.relation && <span className={s.muted}> · {r.relation}</span>}
              </span>
              <span className={s.barTrack} aria-hidden="true">
                <span className={s.barFill} style={{ width: `${(r.count / max) * 100}%` }} />
              </span>
              <span className={s.barCount}>{r.count}</span>
            </li>
          ))}
        </ul>
      </section>

      <ListRow
        icon={<WindowIcon />}
        title="Home window"
        subtitle={`See ${homeCity} right now · new voice message`}
        to="/family/window"
      />

      <section aria-labelledby="sees-title">
        <div className={s.sectionHead}>
          <h2 id="sees-title" className={s.sectionTitle}>
            What your family sees
          </h2>
          <Button variant="text" onClick={() => showNote('Sharing is fixed in this demo')}>
            Change
          </Button>
        </div>
        <dl className={s.facts}>
          <div className={s.factRow}>
            <dt>Heartbeat</dt>
            <dd className={s.mono}>{shared.heartRateBpm} bpm</dd>
          </div>
          <div className={s.factRow}>
            <dt>Mood</dt>
            <dd>{shared.mood}</dd>
          </div>
        </dl>
        <p className={s.privacy}>
          <LockIcon />
          <span>Your health details and cycle are never shared.</span>
        </p>
      </section>

      <p className={s.why}>
        Why hugs matter: staying connected to family is one way crews cope with months away from
        home. Source: NASA Human Research Program, Behavioral Health and Performance.
      </p>

      <div className={s.actions}>
        <Button variant="primary" onClick={() => showNote('Hug sent home')}>
          Send a hug home
        </Button>
      </div>

      {note && (
        <p className={s.toast} role="status">
          {note}
        </p>
      )}
    </main>
  );
}
