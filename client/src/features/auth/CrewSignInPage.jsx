// Crew sign-in page (owner: Hana Sakr). Placeholder: replace with the real screen.
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../shared/Button.jsx';
import { getSampleData } from '../../shared/sampleData.js';
import { fetchCrew } from './authApi.js';
import CrewTile from './CrewTile.jsx';
import s from './styles.module.css';

const SKELETONS = [0, 1, 2, 3];

export default function CrewSignInPage() {
  const navigate = useNavigate();
  const alive = useRef(true);
  const [state, setState] = useState({ status: 'loading', crew: [], day: null });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading' }));
    try {
      const [crew, today] = await Promise.all([
        fetchCrew(),
        getSampleData('today').catch(() => null),
      ]);
      if (!alive.current) return;
      setState({ status: 'ready', crew, day: today?.missionDay ?? null });
    } catch {
      if (!alive.current) return;
      setState({ status: 'error', crew: [], day: null });
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  const pick = (member) => navigate('/signin/pin', { state: { crew: member } });

  const { status, crew, day } = state;
  const subtitle = [
    'Mars Transit',
    day != null ? `day ${day}` : null,
    status === 'ready' && crew.length > 0 ? `crew of ${crew.length}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <main className={s.page}>
      <header className={s.hero}>
        <div className={s.logo}>
          <svg viewBox="0 0 24 24" className={s.logoMark} aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M4 12h4l2-4 3 8 2-4h5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className={s.wordmark}>NABD</span>
        </div>
        <svg
          viewBox="0 0 240 32"
          className={s.heartbeat}
          aria-hidden="true"
          focusable="false"
          preserveAspectRatio="xMidYMid meet"
        >
          <path
            className={s.heartbeatPath}
            pathLength="1"
            d="M0 16h82l8-10 10 22 10-30 10 18 6-6h114"
          />
        </svg>
        <h1 className={s.title}>Who&rsquo;s using NABD?</h1>
        <p className={s.subtitle}>{subtitle}</p>
      </header>

      {status === 'loading' && (
        <div className={s.grid} role="status" aria-busy="true" aria-label="Loading crew">
          {SKELETONS.map((i) => (
            <div key={i} className={`${s.tile} ${s.skeleton}`} aria-hidden="true" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className={s.notice} role="alert">
          <p className={s.noticeText}>
            Can&rsquo;t load the crew list. Check your connection and try again.
          </p>
          <Button variant="secondary" onClick={load}>
            Try again
          </Button>
        </div>
      )}

      {status === 'ready' && crew.length === 0 && (
        <div className={s.notice}>
          <p className={s.noticeText}>No crew members yet. Ask Mission Control to add you.</p>
          <Button variant="secondary" onClick={load}>
            Refresh
          </Button>
        </div>
      )}

      {status === 'ready' && crew.length > 0 && (
        <div className={s.grid}>
          {crew.map((member) => (
            <CrewTile key={member.id} member={member} onPick={pick} />
          ))}
        </div>
      )}

      <footer className={s.footer}>
        <p className={s.privacy}>
          <svg viewBox="0 0 24 24" className={s.icon} aria-hidden="true" focusable="false">
            <rect
              x="5"
              y="11"
              width="14"
              height="9"
              rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M8 11V8a4 4 0 0 1 8 0v3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span>Your health data stays private to you</span>
        </p>
        <Button variant="text" to="/admin/signin">
          Mission Control sign-in
        </Button>
      </footer>
    </main>
  );
}
