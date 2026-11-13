import { useCallback, useEffect, useRef, useState } from 'react';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import Button from '../../shared/Button.jsx';
import Planet from '../../shared/Planet.jsx';
import { getSampleData } from '../../shared/sampleData.js';
import { getSession } from '../../shared/session.js';
import { sendHug } from './hugApi.js';
import { useHoldToSend } from './useHoldToSend.js';
import { HeartIcon } from './HeartRipple.jsx';
import s from './styles.module.css';

const HOLD_MS = 1000;

function CheckIcon() {
  return (
    <svg
      className={s.checkIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export default function SendHugPage() {
  const session = getSession();
  const from = (session?.role === 'family' && session.name) || 'Laila';

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // idle -> (holding is derived from progress) -> sending -> sent | error
  const [status, setStatus] = useState('idle');
  const sendingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    Promise.all([getSampleData('today'), getSampleData('mission'), getSampleData('hugs')])
      .then(([today, mission, hugs]) => {
        if (!cancelled) setData({ today, mission, hugs });
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const send = useCallback(async () => {
    if (sendingRef.current) return; // no double send
    sendingRef.current = true;
    setStatus('sending');
    try {
      await sendHug(from);
      setStatus('sent');
    } catch {
      setStatus('error');
    } finally {
      sendingRef.current = false;
    }
  }, [from]);

  const locked = status === 'sending' || status === 'sent';
  const { progress, bind } = useHoldToSend({ holdMs: HOLD_MS, onComplete: send, disabled: locked });

  if (loadError) {
    return (
      <main className={s.page}>
        <ScreenHeader eyebrow={`NABD FAMILY · ${from.toUpperCase()}`} title="Send a hug" />
        <div className={s.stateBox} role="alert">
          <p className={s.stateText}>Couldn't load. Check the connection and try again.</p>
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
        <ScreenHeader eyebrow={`NABD FAMILY · ${from.toUpperCase()}`} title="Send a hug" />
        <p className={s.stateText} role="status">
          Loading…
        </p>
      </main>
    );
  }

  const { today, mission, hugs } = data;
  const millionKm = Math.round(mission.distanceFromEarthKm / 1_000_000);
  const journey = Math.min(1, today.missionDay / mission.marsArrivalMissionDay);
  const shared = hugs.sharedWithFamilyNow;
  const holding = progress > 0 && !locked;
  const minutes = mission.earthDelayOneWay.minutes;

  const buttonLabel =
    status === 'sending' ? 'Sending…' : holding ? 'Keep holding' : 'Hold to send a hug';

  return (
    <main className={s.page}>
      <ScreenHeader
        eyebrow={`NABD FAMILY · ${from.toUpperCase()}`}
        title={`Mama is on day ${today.missionDay}`}
      />
      <p className={s.lead}>
        {millionKm} million km from home · {mission.daysToMars} days to Mars
      </p>

      <div
        className={s.journey}
        role="img"
        aria-label={`Journey from Earth to Mars, ${Math.round(journey * 100)} percent of the way`}
      >
        <Planet kind="earth" size={32} />
        <span className={s.journeyLine}>
          <span className={s.journeyDone} style={{ width: `${journey * 100}%` }} />
          <span className={s.journeyDot} style={{ left: `${journey * 100}%` }} />
        </span>
        <Planet kind="mars" size={32} />
      </div>

      <dl className={s.facts}>
        <div className={s.factRow}>
          <dt>Her heartbeat, live</dt>
          <dd className={s.mono}>
            <HeartIcon className={s.inlineHeart} /> {shared.heartRateBpm} bpm
          </dd>
        </div>
        <div className={s.factRow}>
          <dt>Her mood</dt>
          <dd>{shared.mood}</dd>
        </div>
      </dl>

      {status === 'sent' ? (
        <div className={s.sent} role="status">
          <span className={s.checkCircle}>
            <CheckIcon />
          </span>
          <p className={s.sentText}>
            Hug sent. In about {minutes} minutes, Mama's phone buzzes three times, in the rhythm of
            your heartbeat.
          </p>
          <Button variant="text" onClick={() => setStatus('idle')}>
            Send another hug
          </Button>
        </div>
      ) : (
        <div className={s.holdArea}>
          <div className={s.holdWrap}>
            <span className={s.ringOuter} aria-hidden="true" />
            <span className={s.ringInner} aria-hidden="true" />
            <button
              type="button"
              className={s.holdButton}
              aria-label="Hold to send a hug"
              disabled={status === 'sending'}
              {...bind}
            >
              <svg
                className={s.progressRing}
                viewBox="0 0 100 100"
                aria-hidden="true"
                focusable="false"
              >
                <circle className={s.progressTrack} cx="50" cy="50" r="46" />
                <circle
                  className={s.progressArc}
                  cx="50"
                  cy="50"
                  r="46"
                  pathLength="1"
                  strokeDasharray={`${progress} 1`}
                />
              </svg>
              <HeartIcon className={s.holdHeart} />
              <span className={s.holdLabel}>{buttonLabel}</span>
            </button>
          </div>
          {status === 'error' && (
            <p className={s.error} role="alert">
              Couldn't send. Try again.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
