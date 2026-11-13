import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../shared/api.js';
import Button from '../../shared/Button.jsx';
import { useSession } from '../../shared/session.js';
import StepProgress from '../../shared/StepProgress.jsx';
import { getSampleData } from '../../shared/sampleData.js';
import styles from './styles.module.css';

const isDemo = new URLSearchParams(window.location.search).get('demo') === '1';
const durationMs = isDemo ? 30_000 : 60_000;
const pollenLifetimeMs = 2_000;
const hitRadiusRatio = 0.1;

function formatTime(milliseconds) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function GamePage() {
  const navigate = useNavigate();
  const session = useSession();
  const crewId = session?.id;
  const endAtRef = useRef(0);
  const remainingMsRef = useRef(durationMs);
  const missCountedRef = useRef(false);
  const [phase, setPhase] = useState('playing');
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [pollen, setPollen] = useState(null);
  const [reactionTimes, setReactionTimes] = useState([]);
  const [misses, setMisses] = useState(0);
  const [age, setAge] = useState(null);
  const [baselineMs, setBaselineMs] = useState(null);
  const [baselineLoading, setBaselineLoading] = useState(true);
  const [baselineError, setBaselineError] = useState('');
  const [baselineReload, setBaselineReload] = useState(0);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let active = true;
    const sampleRequests = crewId === 'sara'
      ? [getSampleData('profile'), getSampleData('reaction-tests')]
      : [Promise.resolve(null), Promise.resolve(null)];
    const historyUrl = `/api/game?crewId=${encodeURIComponent(crewId || '')}`;

    Promise.all([Promise.all(sampleRequests), apiFetch(historyUrl)])
      .then(([[profile, reactionData], ownHistory]) => {
        const memberHistory = [
          ...(Array.isArray(reactionData?.recent) ? reactionData.recent : []),
          ...(Array.isArray(ownHistory.history) ? ownHistory.history : []),
        ]
          .filter((entry) => Number.isFinite(entry.averageMs))
          .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
          .slice(-7);
        const baselineValues = [
          ...(Number.isFinite(reactionData?.usualMs) ? [reactionData.usualMs] : []),
          ...memberHistory.map((entry) => entry.averageMs),
        ];
        if (active) {
          setAge(profile?.age ?? ownHistory.age ?? null);
          setBaselineMs(
            baselineValues.length
              ? Math.round(baselineValues.reduce((total, value) => total + value, 0) / baselineValues.length)
              : null,
          );
          setBaselineError('');
        }
      })
      .catch((error) => {
        if (active) setBaselineError(error.message);
      })
      .finally(() => {
        if (active) setBaselineLoading(false);
      });
    return () => {
      active = false;
    };
  }, [crewId, baselineReload]);

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    endAtRef.current = Date.now() + remainingMsRef.current;
    const timer = window.setInterval(() => {
      const next = Math.max(0, endAtRef.current - Date.now());
      remainingMsRef.current = next;
      setRemainingMs(next);
      if (next === 0) setPhase('saving');
    }, 100);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing' || pollen) return undefined;
    const wait = 700 + Math.random() * 1800;
    const timer = window.setTimeout(() => {
      missCountedRef.current = false;
      setPollen({
        x: 18 + Math.random() * 64,
        y: 18 + Math.random() * 58,
        shownAt: performance.now(),
      });
    }, wait);
    return () => window.clearTimeout(timer);
  }, [phase, pollen]);

  useEffect(() => {
    if (phase !== 'playing' || !pollen) return undefined;
    const remaining = Math.max(0, pollen.shownAt + pollenLifetimeMs - performance.now());
    const timer = window.setTimeout(() => {
      if (!missCountedRef.current) {
        missCountedRef.current = true;
        setMisses((count) => count + 1);
      }
      setPollen(null);
      missCountedRef.current = false;
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [phase, pollen]);

  useEffect(() => {
    if (phase !== 'saving') return undefined;
    let active = true;
    const averageMs = reactionTimes.length
      ? Math.round(reactionTimes.reduce((total, value) => total + value, 0) / reactionTimes.length)
      : null;

    apiFetch(`/api/game?crewId=${encodeURIComponent(crewId || '')}`, {
      method: 'POST',
      body: { averageMs, catches: reactionTimes.length, misses },
    })
      .then(() => {
        if (active) navigate('/checkin/results', { state: { reactionMs: averageMs } });
      })
      .catch((error) => {
        if (active) {
          setSaveError(error.message);
          setPhase('error');
        }
      });
    return () => {
      active = false;
    };
  }, [phase, reactionTimes, misses, navigate, crewId]);

  function handleFieldTap(event) {
    if (phase !== 'playing') return;
    if (!pollen) {
      if (!missCountedRef.current) {
        missCountedRef.current = true;
        setMisses((count) => count + 1);
      }
      return;
    }
    if (performance.now() - pollen.shownAt >= pollenLifetimeMs) {
      setPollen(null);
      if (!missCountedRef.current) {
        missCountedRef.current = true;
        setMisses((count) => count + 1);
      }
      missCountedRef.current = false;
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const pollenX = bounds.left + bounds.width * pollen.x / 100;
    const pollenY = bounds.top + bounds.height * pollen.y / 100;
    const distance = Math.hypot(event.clientX - pollenX, event.clientY - pollenY);
    if (distance > Math.min(bounds.width, bounds.height) * hitRadiusRatio) {
      if (!missCountedRef.current) {
        missCountedRef.current = true;
        setMisses((count) => count + 1);
      }
      setPollen(null);
      return;
    }
    setReactionTimes((times) => [...times, Math.round(performance.now() - pollen.shownAt)]);
    setPollen(null);
    missCountedRef.current = false;
  }

  function togglePause() {
    if (phase === 'playing') {
      const next = Math.max(0, endAtRef.current - Date.now());
      remainingMsRef.current = next;
      setRemainingMs(next);
      setPollen(null);
      setPhase('paused');
    } else if (phase === 'paused') {
      setPhase('playing');
    }
  }

  const averageMs = reactionTimes.length
    ? Math.round(reactionTimes.reduce((total, value) => total + value, 0) / reactionTimes.length)
    : null;

  return (
    <main className={styles.game}>
      <div className={styles.topRow}>
        <Link className={styles.cancel} to="/checkin/record">Cancel</Link>
        <StepProgress step={2} total={2} label="Pollen catch" />
      </div>

      <h1 className={styles.title}>Tap the pollen the moment it glows</h1>

      <section className={styles.stats} aria-label="Game stats">
        <div className={styles.stat}>
          <strong>{reactionTimes.length}</strong>
          <span>Catches</span>
        </div>
        <div className={styles.stat}>
          <strong>{averageMs == null ? '—' : `${averageMs} ms`}</strong>
          <span>
            {baselineLoading
              ? 'Loading your baseline…'
              : baselineMs == null
                ? `Age ${age ?? '—'} · building your baseline`
                : `Age ${age ?? '—'} · baseline ${baselineMs} ms`}
          </span>
        </div>
        <div className={styles.stat}>
          <strong>{formatTime(remainingMs)}</strong>
          <span>Left</span>
        </div>
      </section>

      {baselineError && (
        <div className={styles.notice} role="status">
          Could not load your personal baseline. {baselineError}
          <Button
            variant="text"
            onClick={() => {
              setBaselineLoading(true);
              setBaselineReload((value) => value + 1);
            }}
          >
            Try again
          </Button>
        </div>
      )}

      <button
        className={styles.field}
        type="button"
        onClick={handleFieldTap}
        disabled={phase === 'saving' || phase === 'error'}
        aria-label={pollen ? 'Tap to catch the glowing pollen' : 'Wait for the pollen to glow'}
      >
        <svg className={styles.garden} viewBox="0 0 360 400" aria-hidden="true">
          <path className={styles.dome} d="M15 360 C22 150 82 40 180 38 C278 40 338 150 345 360" />
          <g className={styles.plants}>
            <path d="M78 360V286m0 22c-16-5-22-15-24-25m24 13c14-4 20-12 23-22" />
            <path d="M180 360V240m0 50c-20-6-27-17-30-29m30 18c18-5 25-15 28-28" />
            <path d="M282 360v-65m0 24c-13-4-18-12-20-21m20 13c12-4 17-11 19-20" />
          </g>
          <g className={styles.dots}>
            <circle cx="115" cy="145" r="4" />
            <circle cx="238" cy="177" r="4" />
            <circle cx="80" cy="285" r="5" />
            <circle cx="180" cy="240" r="6" />
            <circle cx="282" cy="295" r="5" />
          </g>
          <path className={styles.soil} d="M0 360h360v40H0z" />
        </svg>
        {pollen && phase === 'playing' && (
          <span
            className={styles.pollen}
            style={{ left: `${pollen.x}%`, top: `${pollen.y}%` }}
            aria-hidden="true"
          />
        )}
        {phase === 'paused' && <span className={styles.overlay}>Paused</span>}
        {phase === 'saving' && <span className={styles.overlay}>Saving results…</span>}
      </button>

      {phase === 'error' && (
        <div className={styles.error} role="alert">
          <p>Could not save your game. {saveError}</p>
          <Button
            variant="secondary"
            onClick={() => {
              setSaveError('');
              setPhase('saving');
            }}
          >
            Try saving again
          </Button>
        </div>
      )}

      <div className={styles.pause}>
        <Button
          variant="secondary"
          onClick={togglePause}
          disabled={phase !== 'playing' && phase !== 'paused'}
        >
          {phase === 'paused' ? 'Resume' : phase === 'playing' ? 'Pause' : 'Game complete'}
        </Button>
      </div>
      <p className={styles.misses} aria-live="polite">
        {misses} {misses === 1 ? 'miss' : 'misses'}
        {isDemo && <span> · Demo mode</span>}
      </p>
    </main>
  );
}
