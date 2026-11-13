// Results page, screen #11 "Check-in results" (owner: Malak).
// Route: /checkin/results
//
// Two ways in:
//   1. Straight after a check-in. The pollen catch game navigates here with state, so we put
//      together the face numbers, the voice numbers and Salma's reaction time, work out the
//      energy score against the baseline, save it and show the last 7 days.
//   2. Opened directly (from the check-in start page or Home), with no state. We load the
//      latest saved check-in for today instead and save nothing.
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Button from '../../shared/Button.jsx';
import Chip from '../../shared/Chip.jsx';
import ListRow from '../../shared/ListRow.jsx';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import StatusLabel from '../../shared/StatusLabel.jsx';
import { apiFetch } from '../../shared/api.js';
import { getSampleData } from '../../shared/sampleData.js';
import { useSession } from '../../shared/session.js';
import { clearDraft, readDraft } from '../mood-voice/checkinDraft.js';
import { computeEnergyScore, describeChanges, labelWords } from './energyScore.js';
import EnergyChart from './EnergyChart.jsx';
import {
  NORMAL_SPREAD,
  advice,
  chartPoints,
  dayName,
  daysInARow,
  runLine,
} from './resultsText.js';
import s from './styles.module.css';

// A check-in left behind by an abandoned attempt is not today's news.
const DRAFT_GOES_STALE_AFTER = 30 * 60 * 1000;

// Where a fresh check-in's numbers come from: the game page passes Salma's reaction time on
// in the navigation state, and the face and voice numbers come from the same state or, if the
// game did not pass them on, from the draft the record page left in this tab.
function freshNumbers(state) {
  const draft = readDraft();
  const kept = draft && Date.now() - (draft.at || 0) < DRAFT_GOES_STALE_AFTER ? draft : {};
  return {
    face: state.face ?? kept.face ?? null,
    voice: state.voice ?? kept.voice ?? null,
    reactionMs: state.reactionMs ?? kept.reactionMs ?? null,
  };
}

// A saved check-in as the screen shows it.
function shape(row) {
  return {
    missionDay: row.missionDay,
    date: row.date,
    energyScore: row.energyScore,
    label: row.label,
    face: row.face || null,
    voice: row.voice || null,
    reactionMs: row.reactionMs ?? null,
    sleepHours: row.context ? row.context.sleepHours : undefined,
  };
}

export default function ResultsPage() {
  const location = useLocation();
  const session = useSession();
  const crewId = (session && session.id) || 'sara';

  const [phase, setPhase] = useState('loading'); // loading | ready | empty | error
  const [mode, setMode] = useState('fresh'); // fresh = just checked in · latest = opened directly
  const [problem, setProblem] = useState(null);
  const [saveProblem, setSaveProblem] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [today, setToday] = useState(null);
  const [result, setResult] = useState(null); // today's check-in, see shape()
  const [history, setHistory] = useState([]);
  const [pickedDay, setPickedDay] = useState(null); // a past day chosen from the chips

  // Save once, however often React re-runs the effect: every run waits for the same save.
  const saveRef = useRef(null);

  useEffect(() => {
    let alive = true;

    // The last 7 days for the chart, oldest first.
    async function loadHistory() {
      const rows = await apiFetch(`/api/mood?crewId=${encodeURIComponent(crewId)}`);
      return Array.isArray(rows) ? rows : [];
    }

    async function run() {
      // The game navigates here with state. Opened any other way there is none.
      const arrivedFromGame = location.state !== null && typeof location.state === 'object';
      const numbers = arrivedFromGame ? freshNumbers(location.state) : null;
      const measured = numbers && (numbers.face || numbers.voice);
      setMode(measured ? 'fresh' : 'latest');
      setPickedDay(null);

      try {
        const [baselineFile, todayFile] = await Promise.all([
          getSampleData('baseline'),
          getSampleData('today'),
        ]);
        if (!alive) return;
        setBaseline(baselineFile);
        setToday(todayFile);

        // ---- Opened directly: show the latest check-in saved today.
        if (!measured) {
          const rows = await loadHistory();
          if (!alive) return;
          setHistory(rows);
          const savedToday = rows.filter((row) => row.missionDay === todayFile.missionDay);
          const latest = savedToday[savedToday.length - 1];
          if (!latest) {
            setPhase('empty');
            return;
          }
          setResult(shape(latest));
          setPhase('ready');
          return;
        }

        // ---- Just checked in: score it, show it, save it.
        const { face, voice, reactionMs } = numbers;
        const { energyScore, label } = computeEnergyScore(face, voice, baselineFile, reactionMs);
        if (energyScore === null) {
          setProblem('We did not get enough from the camera or the microphone to work out a score.');
          setPhase('error');
          return;
        }
        const now = {
          missionDay: todayFile.missionDay,
          date: todayFile.date,
          energyScore,
          label,
          face,
          voice,
          reactionMs,
          sleepHours: todayFile.sleepLastNightHours,
        };
        setResult(now);
        setPhase('ready');

        if (!saveRef.current) {
          saveRef.current = apiFetch('/api/mood', {
            method: 'POST',
            body: {
              crewId,
              face,
              voice,
              context: { sleepHours: todayFile.sleepLastNightHours },
              energyScore,
              label,
              reactionMs,
            },
          })
            .then((saved) => ({ saved }))
            .catch((err) => ({ error: err.message }));
        }
        const outcome = await saveRef.current;
        if (!alive) return;
        if (outcome.error) setSaveProblem(outcome.error);
        else {
          // It is saved, so the half-finished draft has done its job.
          clearDraft();
          if (outcome.saved && outcome.saved.missionDay) {
            setResult({ ...now, missionDay: outcome.saved.missionDay });
          }
        }

        try {
          const rows = await loadHistory();
          if (alive) setHistory(rows);
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
  }, [location.state, crewId]);

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
        <ScreenHeader backTo="/" backLabel="Home" eyebrow="Check-in" title="No check-in yet today" />
        <p className={s.muted}>
          The check-in takes two minutes: read one sentence out loud twice, then catch some pollen.
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

  // The check-in the chart can be read against: the saved days, plus today's if the server
  // did not give it back (saving failed or the list could not be read).
  const known = history.some((row) => row.missionDay === result.missionDay)
    ? history
    : [...history, result].slice(-7);

  // Today's, or a past day the person picked from the days under the chart.
  const pickedRow = pickedDay === null ? null : known.find((row) => row.missionDay === pickedDay);
  const viewingPast = Boolean(pickedRow) && pickedRow.missionDay !== result.missionDay;
  const shown = viewingPast ? shape(pickedRow) : result;
  const shownAt = known.findIndex((row) => row.missionDay === shown.missionDay);

  const { energyScore, label, face, voice, reactionMs } = shown;
  const words = labelWords(label);
  const changes = describeChanges(face, voice, baseline, reactionMs);
  const points = chartPoints(known, baselineScore);
  const run = daysInARow(known.slice(0, shownAt + 1));

  // The sleep behind the advice is that day's own sleep.
  const adviceToday = viewingPast
    ? { sleepLastNightHours: shown.sleepHours, sleepShortNightsInARow: 0 }
    : today;

  const eyebrow = viewingPast
    ? `Check-in · Day ${shown.missionDay}`
    : mode === 'latest'
      ? `Latest check-in · Day ${shown.missionDay}`
      : `${saveProblem ? 'Check-in not saved' : 'Check-in saved'} · Day ${shown.missionDay}`;

  function pick(day) {
    setPickedDay(day === result.missionDay ? null : day);
    // The result is at the top, the days are under the chart.
    window.scrollTo(0, 0);
  }

  return (
    <main>
      <ScreenHeader
        backTo={mode === 'latest' ? '/' : undefined}
        backLabel="Home"
        eyebrow={eyebrow}
        title={viewingPast ? `Day ${shown.missionDay} vs your normal` : 'Today vs your normal'}
      />

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

      {saveProblem && !viewingPast && (
        <p className={s.problem} role="alert">
          We worked out your score but could not save it: {saveProblem}
        </p>
      )}

      <section className={s.block} aria-label="What changed">
        <h2 className={s.heading}>What changed</h2>
        {changes.length === 0 ? (
          <p className={s.muted}>Nothing to compare.</p>
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
        {!face && <p className={s.muted}>Voice only, so the face numbers are missing.</p>}
        {!voice && <p className={s.muted}>No voice numbers, so only the face was compared.</p>}
      </section>

      <section className={s.block} aria-label="Energy, last 7 days">
        <h2 className={s.heading}>Energy, last 7 days</h2>
        <EnergyChart points={points} normalFrom={normalFrom} normalTo={normalTo} />
        {known.length > 1 && (
          <>
            <p className={s.muted}>Tap a day to see how it went.</p>
            <div className={s.days}>
              {known.map((row) => (
                <Chip
                  key={row.missionDay}
                  selected={row.missionDay === shown.missionDay}
                  onClick={() => pick(row.missionDay)}
                >
                  {dayName(row.date, row.missionDay === result.missionDay)}
                </Chip>
              ))}
            </div>
          </>
        )}
      </section>

      <section className={s.block} aria-label="What to do">
        <p className={s.advice}>{advice(label, adviceToday, baseline)}</p>
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
