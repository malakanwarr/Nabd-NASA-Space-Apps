// Results page, screen #11 "Check-in results" (owner: Malak).
// Route: /checkin/results
//
// Puts together today's face numbers, voice numbers and Salma's reaction time, works out
// the energy score against Sara's baseline, saves the check-in and shows the last 7 days.
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Button from '../../shared/Button.jsx';
import ListRow from '../../shared/ListRow.jsx';
import StatusLabel from '../../shared/StatusLabel.jsx';
import { apiFetch } from '../../shared/api.js';
import { getSampleData } from '../../shared/sampleData.js';
import { readDraft } from '../mood-voice/checkinDraft.js';
import { computeEnergyScore, describeChanges, labelWords } from './energyScore.js';
import EnergyChart from './EnergyChart.jsx';
import { NORMAL_SPREAD, advice, chartPoints, daysInARow, runLine } from './resultsText.js';
import s from './styles.module.css';

// A check-in left behind by an abandoned attempt is not today's news.
const DRAFT_GOES_STALE_AFTER = 30 * 60 * 1000;

// Where today's numbers come from: the game page passes them on, and the draft in this tab
// is the backup. Salma's reaction time arrives in the navigation state.
function todaysNumbers(state) {
  const fromState = state || {};
  const draft = readDraft();
  const fresh = draft && Date.now() - (draft.at || 0) < DRAFT_GOES_STALE_AFTER ? draft : {};
  return {
    face: fromState.face ?? fresh.face ?? null,
    voice: fromState.voice ?? fresh.voice ?? null,
    reactionMs: fromState.reactionMs ?? fresh.reactionMs ?? null,
  };
}

export default function ResultsPage() {
  const location = useLocation();

  const [phase, setPhase] = useState('loading'); // loading | ready | empty | error
  const [problem, setProblem] = useState(null);
  const [saveProblem, setSaveProblem] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [today, setToday] = useState(null);
  const [result, setResult] = useState(null); // { energyScore, label, face, voice, reactionMs }
  const [history, setHistory] = useState([]);
  const [missionDay, setMissionDay] = useState(null);

  // Save once, however often React re-runs the effect.
  const savedAlready = useRef(false);

  useEffect(() => {
    let alive = true;

    async function run() {
      const { face, voice, reactionMs } = todaysNumbers(location.state);
      try {
        const [baselineFile, todayFile] = await Promise.all([
          getSampleData('baseline'),
          getSampleData('today'),
        ]);
        if (!alive) return;
        setBaseline(baselineFile);
        setToday(todayFile);

        // Nobody checked in: show the history and the way back to the check-in.
        if (!face && !voice) {
          const rows = await apiFetch('/api/mood').catch(() => []);
          if (!alive) return;
          setHistory(Array.isArray(rows) ? rows : []);
          setPhase('empty');
          return;
        }

        const { energyScore, label } = computeEnergyScore(face, voice, baselineFile, reactionMs);
        if (!alive) return;
        if (energyScore === null) {
          setProblem('We did not get enough from the camera or the microphone to work out a score.');
          setPhase('error');
          return;
        }
        setResult({ energyScore, label, face, voice, reactionMs });
        setMissionDay(todayFile.missionDay);
        setPhase('ready');

        // Save it, then read the last 7 days back for the chart.
        let saved = null;
        if (!savedAlready.current) {
          savedAlready.current = true;
          try {
            saved = await apiFetch('/api/mood', {
              method: 'POST',
              body: {
                face,
                voice,
                context: { sleepHours: todayFile.sleepLastNightHours },
                energyScore,
                label,
                reactionMs,
              },
            });
          } catch (err) {
            if (alive) setSaveProblem(err.message);
          }
        }
        if (!alive) return;
        if (saved && saved.missionDay) setMissionDay(saved.missionDay);

        try {
          const rows = await apiFetch('/api/mood');
          if (alive && Array.isArray(rows)) setHistory(rows);
        } catch {
          // The chart simply shows today only; the score is already on the screen.
          if (alive) setHistory([]);
        }
      } catch (err) {
        if (alive) {
          setProblem(err.message);
          setPhase('error');
        }
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [location.state]);

  if (phase === 'loading') {
    return (
      <main>
        <header className={s.head}>
          <p className={s.eyebrow}>Check-in</p>
          <h1 className={s.title}>Working out your energy…</h1>
        </header>
        <p className={s.muted}>Comparing today with your normal.</p>
      </main>
    );
  }

  if (phase === 'error') {
    return (
      <main>
        <header className={s.head}>
          <p className={s.eyebrow}>Check-in</p>
          <h1 className={s.title}>We could not finish this check-in</h1>
        </header>
        <p className={s.problem} role="alert">
          {problem}
        </p>
        <div className={s.actions}>
          <Button to="/checkin">Start the check-in again</Button>
          <Button variant="text" to="/">
            Back to home
          </Button>
        </div>
      </main>
    );
  }

  const baselineScore = (baseline && baseline.mood && baseline.mood.energyScore) || 84;
  const normalFrom = baselineScore - NORMAL_SPREAD;
  const normalTo = baselineScore + NORMAL_SPREAD;

  if (phase === 'empty') {
    const points = chartPoints(history, baselineScore);
    return (
      <main>
        <header className={s.head}>
          <p className={s.eyebrow}>Check-in</p>
          <h1 className={s.title}>No check-in yet today</h1>
        </header>
        <p className={s.muted}>
          The check-in takes two minutes: read one sentence out loud, then catch some pollen.
        </p>
        {points.length > 0 && (
          <section className={s.block} aria-label="Energy, last days">
            <h2 className={s.heading}>Energy, last days</h2>
            <EnergyChart points={points} normalFrom={normalFrom} normalTo={normalTo} />
          </section>
        )}
        <div className={s.actions}>
          <Button to="/checkin">Start today's check-in</Button>
        </div>
      </main>
    );
  }

  const { energyScore, label, face, voice, reactionMs } = result;
  const words = labelWords(label);
  const changes = describeChanges(face, voice, baseline, reactionMs);
  const points = chartPoints(history.length ? history : [{ date: today.date, energyScore, label }], baselineScore);
  const run = daysInARow(history);

  return (
    <main>
      <header className={s.head}>
        <p className={s.eyebrow}>
          {saveProblem ? 'Check-in not saved' : 'Check-in saved'}
          {missionDay ? ` · Day ${missionDay}` : ''}
        </p>
        <h1 className={s.title}>Today vs your normal</h1>
      </header>

      <section className={s.score} aria-label="Energy">
        <p className={s.big}>
          <strong className={`${s.number} ${s[words.status]}`}>{energyScore}</strong>
          <span className={s.outOf}>/100</span>
        </p>
        <div className={s.scoreWords}>
          <p className={`${s.scoreTitle} ${s[words.status]}`}>{words.title}</p>
          <StatusLabel status={words.status} />
          <p className={s.muted}>{runLine(label, run)}</p>
        </div>
      </section>

      {saveProblem && (
        <p className={s.problem} role="alert">
          We worked out your score but could not save it: {saveProblem}
        </p>
      )}

      <section className={s.block} aria-label="What changed">
        <h2 className={s.heading}>What changed</h2>
        {changes.length === 0 ? (
          <p className={s.muted}>Nothing to compare today.</p>
        ) : (
          <div>
            {changes.map((row) => (
              <ListRow
                key={row.key}
                title={row.name}
                right={
                  <span className={s.changeValue}>
                    <strong className={row.tired ? s.watch : s.stable}>{row.value}</strong>{' '}
                    <span className={s.muted}>· {row.detail}</span>
                  </span>
                }
              />
            ))}
          </div>
        )}
        {!face && <p className={s.muted}>Voice only today, so the face numbers are missing.</p>}
        {!voice && <p className={s.muted}>No voice numbers today, so only the face was compared.</p>}
      </section>

      <section className={s.block} aria-label="Energy, last 7 days">
        <h2 className={s.heading}>Energy, last 7 days</h2>
        <EnergyChart points={points} normalFrom={normalFrom} normalTo={normalTo} />
      </section>

      <section className={s.block} aria-label="What to do">
        <p className={s.advice}>{advice(label, today, baseline)}</p>
        <p className={s.nasa}>
          Based on NASA research: on long missions, short and broken sleep is one of the main
          risks to how well a crew member works and feels.
        </p>
        <div className={s.actions}>
          <Button to="/doctor">Plan tonight's sleep with the AI doctor</Button>
          <Button variant="text" to="/family">
            Ask family for a hug
          </Button>
        </div>
      </section>
    </main>
  );
}
