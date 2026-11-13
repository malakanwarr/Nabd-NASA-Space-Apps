// One body system (owner: Hana Haytham). Design: BodyDetail.dc.html. One template for all 7 systems
// at /body/:system. (The cycle system has its own page at /body/cycle, owned by Layal.)
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StatusLabel from '../../shared/StatusLabel.jsx';
import Button from '../../shared/Button.jsx';
import { getSampleData } from '../../shared/sampleData.js';
import { HAZARDS, SYSTEM_INFO } from './systemInfo.js';
import s from './styles.module.css';

const FILES = ['body-systems', 'history-14-days', 'baseline', 'today', 'mission', 'reaction-tests'];

// Small organ drawing next to the title, colored by status.
function OrganIcon({ id, status }) {
  const c = `${s[`fill_${status}`]} ${status !== 'stable' ? s.pulse : ''}`;
  const st = `${s[`stroke_${status}`]} ${status !== 'stable' ? s.pulse : ''}`;
  const shapes = {
    bones: (
      <>
        <path className={c} d="M14 10 C8 16 10 28 22 30 C30 31 34 26 36 22 C38 26 42 31 50 30 C62 28 64 16 58 10 C50 16 44 14 36 12 C28 14 22 16 14 10 Z" />
        <path className={`${s.bone} ${st}`} d="M24 32 L20 82 M48 32 L52 82" />
      </>
    ),
    mind: (
      <>
        <path className={c} d="M10 46 C6 24 22 10 36 14 C50 8 68 22 64 42 C70 54 60 70 48 70 L22 70 C10 70 4 58 10 46 Z" />
        <path className={s.folds} d="M20 32 C26 38 30 28 36 34 C42 40 46 28 52 34 M18 52 C26 46 34 58 42 50 C48 46 54 54 58 50" />
      </>
    ),
    eyes: (
      <>
        <ellipse className={c} cx="36" cy="44" rx="30" ry="16" />
        <circle className={s.visor} cx="36" cy="44" r="9" />
      </>
    ),
    kidneys: (
      <>
        <ellipse className={c} cx="22" cy="44" rx="12" ry="22" transform="rotate(-12 22 44)" />
        <ellipse className={c} cx="50" cy="44" rx="12" ry="22" transform="rotate(12 50 44)" />
      </>
    ),
    heart: <path className={c} d="M36 74 C20 60 6 50 8 32 C10 18 28 14 36 28 C44 14 62 18 64 32 C66 50 52 60 36 74 Z" />,
    immune: <path className={c} d="M36 8 L64 20 C64 46 54 66 36 80 C18 66 8 46 8 20 Z" />,
    radiation: (
      <>
        <rect className={c} x="18" y="14" width="36" height="56" rx="6" />
        <circle className={s.visor} cx="36" cy="38" r="9" />
      </>
    ),
  };
  return (
    <svg className={s.organIcon} viewBox="0 0 72 88" aria-hidden="true">
      {shapes[id]}
    </svg>
  );
}

// 14-day trend in the design's style: thin line, dashed "usual" line, colored dot at today.
function TrendChart({ chart, days, baseline, status }) {
  const points = days.filter((d) => d[chart.field] != null).map((d) => ({ day: d.missionDay, value: d[chart.field] }));
  if (points.length < 2) return <p className={s.muted}>Not enough readings for a chart yet.</p>;

  const W = 358;
  const H = 120;
  const left = 20;
  const right = 350;
  const top = 34;
  const bottom = 100;
  const values = points.map((p) => p.value).concat(baseline != null ? [baseline] : []);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const x = (i) => left + (i * (right - left)) / (points.length - 1);
  const y = (v) => bottom - ((v - min) / (max - min)) * (bottom - top);
  const first = points[0];
  const last = points[points.length - 1];
  const mid = points[Math.floor(points.length / 2)];
  const description =
    `${chart.label}, last ${points.length} days: from ${first.value} ${chart.unit} on day ${first.day} to ${last.value} ${chart.unit} today.` +
    (baseline != null ? ` ${chart.baselineLabel}: ${baseline} ${chart.unit}.` : '');

  return (
    <div className={s.chartBox}>
      <span className={s.muted}>{chart.label}, last {points.length} days</span>
      <svg className={s.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={description}>
        <line x1={left} y1={bottom + 6} x2={right} y2={bottom + 6} className={s.axis} />
        {baseline != null && (
          <>
            <line x1={left} y1={y(baseline)} x2={right} y2={y(baseline)} className={s.baseline} />
            <text x={right} y={Math.max(12, y(baseline) - 6)} textAnchor="end" className={s.chartText}>
              {chart.baselineLabel} {baseline} {chart.unit}
            </text>
          </>
        )}
        <polyline className={s.draw} pathLength="100" points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')} />
        <circle cx={x(points.length - 1)} cy={y(last.value)} r="5" className={s[`fill_${status}`]} />
        <g className={s.chartText} textAnchor="middle">
          <text x={left + 8} y={H - 2}>
            Day {first.day}
          </text>
          <text x={x(Math.floor(points.length / 2))} y={H - 2}>
            Day {mid.day}
          </text>
          <text x={right - 8} y={H - 2}>
            Today
          </text>
        </g>
      </svg>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/body" className={s.back}>
      <svg className={s.backIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" />
      </svg>
      Body
    </Link>
  );
}

export default function SystemDetailPage() {
  const { system: id } = useParams();
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | error

  function fetchAll() {
    Promise.all(FILES.map((f) => getSampleData(f)))
      .then(([systems, history, baseline, today, mission, reaction]) => {
        setData({ systems, history, baseline, today, mission, reaction });
        setState('ready');
      })
      .catch(() => setState('error'));
  }

  function retry() {
    setState('loading');
    fetchAll();
  }

  useEffect(fetchAll, []);

  if (state === 'loading') {
    return (
      <main className={s.detail}>
        <BackLink />
        <p className={s.muted} role="status">
          Loading…
        </p>
      </main>
    );
  }

  if (state === 'error') {
    return (
      <main className={s.detail}>
        <BackLink />
        <p className={s.errorText} role="alert">
          This body system can't load right now.
        </p>
        <button type="button" className={s.secondaryBtn} onClick={retry}>
          Try again
        </button>
      </main>
    );
  }

  const system = data.systems?.systems?.find((x) => x.id === id);
  const info = SYSTEM_INFO[id];

  if (!system || !info) {
    return (
      <main className={s.detail}>
        <BackLink />
        <h1 className={s.title}>Body system</h1>
        <p className={s.muted}>We couldn't find that body system.</p>
      </main>
    );
  }

  // Each part is wrapped so one missing data field hides one part instead of breaking the page.
  const d = { system, today: data.today, baseline: data.baseline, mission: data.mission, reaction: data.reaction };
  const safe = (fn, fallback) => {
    try {
      return fn();
    } catch {
      return fallback;
    }
  };
  const numbers = safe(() => info.numbers(d), []);
  const steps = safe(() => info.today(d), []);
  const baseline = info.chart ? safe(() => info.chart.baseline(d), null) : null;
  const officerFirst = data.mission?.crewMedicalOfficer?.split(' ')[0] || 'the crew medical officer';
  const surgeon = data.mission?.flightSurgeonOnEarth || 'The flight surgeon';
  const warnClass = s[`text_${system.status === 'stable' ? 'watch' : system.status}`];

  return (
    <main className={s.detail}>
      <header className={s.detailHead}>
        <BackLink />
        <div className={s.titleRow}>
          <OrganIcon id={id} status={system.status} />
          <div className={s.titleText}>
            <span className={s.cardStatus}>
              <StatusLabel status={system.status} />
              {system.riskScore != null && <span className={s[`text_${system.status}`]}>· risk {system.riskScore}</span>}
            </span>
            <h1 className={s.title}>{system.name}</h1>
            <span className={s.muted}>{info.area}</span>
          </div>
        </div>
      </header>

      {id === 'bones' && <Button to="/body/muscles">Check your muscles</Button>}

      <section className={s.textSection} aria-label="What it does">
        <h2 className={s.label}>What it does</h2>
        <p className={s.body}>{info.what}</p>
      </section>

      <section className={s.textSection} aria-label="Why space affects it">
        <h2 className={s.label}>Why space affects it</h2>
        <p className={s.body}>{info.why}</p>
        <span className={s.hazard}>
          <svg className={s.icon16} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <ellipse cx="12" cy="12" rx="10" ry="4.5" />
          </svg>
          NASA hazard: {HAZARDS[info.hazard]}
        </span>
      </section>

      <section className={s.listSection} aria-label="Your numbers">
        <h2 className={s.h2}>Your numbers</h2>
        {numbers.length === 0 && <p className={s.muted}>No numbers yet for this system.</p>}
        {numbers.map((n) => (
          <div key={n.label} className={s.numRow}>
            <span>{n.label}</span>
            <strong className={`${s.mono} ${n.warn ? warnClass : ''}`}>{n.value}</strong>
          </div>
        ))}
        {info.chart && <TrendChart chart={info.chart} days={data.history?.days || []} baseline={baseline} status={system.status} />}
      </section>

      {steps.length > 0 && (
        <section className={s.listSection} aria-label="What to do today">
          <h2 className={s.h2}>What to do today</h2>
          {steps.map((t, i) => (
            <div key={t} className={s.stepRow}>
              <strong className={`${s.mono} ${s.stepNum}`}>{i + 1}</strong>
              <span>{t}</span>
            </div>
          ))}
        </section>
      )}

      <section className={s.helpCard} aria-label="When to get help">
        <h2 className={s.helpTitle}>When to get help</h2>
        <p className={s.helpText}>
          <strong>Tell {officerFirst} now</strong> {info.helpNow}
        </p>
        <p className={s.helpText}>
          <strong>{surgeon} reviews</strong> your trend every week.
          {system.status !== 'stable' && ` This system is on ${system.status === 'act' ? 'Act' : 'Watch'}, so today's steps matter now.`}
        </p>
      </section>

      <Link to={`/doctor?ask=${encodeURIComponent(`Tell me about my ${system.name.toLowerCase()}.`)}`} className={s.mainBtn}>
        Ask the AI doctor about this
      </Link>
    </main>
  );
}
