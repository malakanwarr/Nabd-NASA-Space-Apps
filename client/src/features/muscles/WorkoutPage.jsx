// Workout with your twin, /body/muscles/workout (owner: Layal). Full screen, no tab bar.
// Rebuilds today's workout (same inputs as the twin page), then runs it step by step: the twin does each move
// with her (WorkoutTwin), reps are counted at 4 s each, timed work and rests count down, and the voice coaches
// (speech.js; it starts only after the Start tap). Pause, Skip, End (with an inline confirm) and a voice toggle.
// The clock runs on timestamps, so it stays right if the phone stutters or the screen goes dark.
// At the end (or when she ends early) each exercise with at least half its sets finished goes through
// completeWorkout with its level (same restore at every level), all saved in one write, then a summary.
// ?demo=1 (for filming): timed work 20 s, rests 10 s, sets of 4 reps; saving works the same.
// Polish: target muscles glow on the moving twin, a progress ring around the counter, a breathing ring and
// Next up card on rests, soft 3-2-1 beeps before each set and a chime at the finish (beeps.js; the Sound
// button mutes beeps and voice together), a segment bar at the top, and the animated finish (FinishSummary).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import Button from '../../shared/Button.jsx';
import ListRow from '../../shared/ListRow.jsx';
import { useSession } from '../../shared/session.js';
import { fillOf } from './MuscleFigure.jsx';
import WorkoutTwin from './WorkoutTwin.jsx';
import { recordWorkoutHeart } from '../health/workoutHeart.js';
import FinishSummary from './FinishSummary.jsx';
import { BreathingRing, NextUp, ProgressRing, SegmentBar, mainMusclesOf } from './WorkoutParts.jsx';
import { countBeep, finishChime, unlockAudio } from './beeps.js';
import { EXERCISES, MUSCLES, completeWorkout } from './muscleModel.js';
import { readLocal, todayIso, writeLocal } from './storage.js';
import { VISIBLE } from './twinFront.js';
import Chip from '../../shared/Chip.jsx';
import { loadTwin, readGender, readYou, twinKey } from './twinState.js';
import { todaysWorkout } from './todaysWorkout.js';
import useWorkoutInputs from './useWorkoutInputs.js';
import { buildSteps, countedExercises, neededSets, setsOf, stepSeconds, totalSeconds } from './workoutSteps.js';
import { isMuted, say, setMuted, stopSpeaking } from './speech.js';
import s from './styles.module.css';

const nowS = () => performance.now() / 1000;

const VIEW_KEY = 'nabd-workout-view';
const VIEWS = [
  { id: 'front', label: 'Front' },
  { id: 'side', label: 'Side' },
  { id: 'back', label: 'Back' },
];

function clock(sec) {
  const t = Math.max(0, Math.ceil(sec));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

function restWords(seconds) {
  return seconds >= 120 ? `${Math.round(seconds / 60)} minutes` : `${seconds} seconds`;
}

// What the voice says when a step starts.
function startLine(step) {
  if (step.type === 'rest') return step.easy ? `${step.label}, ${restWords(step.seconds)}.` : `Rest, ${restWords(step.seconds)}.`;
  if (step.sets > 1) return `${step.say}, ${step.unit.toLowerCase()} ${step.set}. Go.`;
  return `${step.say}. Go.`;
}

function minutesText(seconds) {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} s`;
  return `${Math.round(seconds / 60)} min`;
}

export default function WorkoutPage() {
  const session = useSession();
  const crewId = session?.id;
  const [params] = useSearchParams();
  const demo = params.get('demo') === '1';

  const [twin] = useState(() => loadTwin(crewId));
  const [gender] = useState(() => readGender(crewId));
  const [person] = useState(() => readYou(crewId));
  const inputs = useWorkoutInputs(crewId, gender);
  const planned =
    inputs.status === 'ready' ? todaysWorkout({ strength: twin.model.strength, energy: inputs.energy, cycle: inputs.cycle }) : null;

  const [phase, setPhase] = useState('ready'); // ready | running | done
  const [, setTick] = useState(0);
  const [muted, setMutedState] = useState(() => isMuted());
  // Front / Side / Back: only changes the picture, never the clock, reps or set. Remembered on the phone.
  const [view, setView] = useState(() => {
    const saved = readLocal(VIEW_KEY, 'side');
    return VIEWS.some((v) => v.id === saved) ? saved : 'side';
  });
  const changeView = (next) => {
    setView(next);
    writeLocal(VIEW_KEY, next);
  };
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [summary, setSummary] = useState(null);
  const eng = useRef(null);
  const wake = useRef(null);

  const rerender = () => setTick((t) => t + 1);

  // ---------- Screen wake lock (where the browser has it) ----------
  const lockScreen = useCallback(async () => {
    try {
      if (!navigator.wakeLock || wake.current) return;
      wake.current = await navigator.wakeLock.request('screen');
      wake.current.addEventListener?.('release', () => {
        wake.current = null;
      });
    } catch {
      wake.current = null;
    }
  }, []);

  const releaseScreen = useCallback(() => {
    try {
      wake.current?.release();
    } catch {
      // already released
    }
    wake.current = null;
  }, []);

  // ---------- The clock ----------
  const getElapsed = useCallback(() => {
    const e = eng.current;
    if (!e) return 0;
    return e.acc + (e.since != null ? nowS() - e.since : 0);
  }, []);

  function enter(i, carry = 0) {
    const e = eng.current;
    e.i = i;
    e.acc = carry;
    e.since = e.paused ? null : nowS();
    e.flags = {};
    say(startLine(e.steps[i]));
  }

  // Saves every exercise that counts (at least half its sets), in one write.
  function saveResult(e) {
    const today = todayIso();
    const counted = countedExercises(e.workout.exercises, e.finished);
    const countedIdx = new Set(counted.map((c) => c.ex));
    let state = loadTwin(crewId).model; // the latest saved twin
    const before = { ...state.strength };
    counted.forEach(({ item }) => {
      if (item.exerciseId) {
        state = completeWorkout(state, item.exerciseId, today, new Date(), { level: e.workout.level, source: 'twin' }).state;
      }
    });
    const saved = counted.length === 0 ? true : writeLocal(twinKey(crewId), state);
    const grown = MUSCLES.filter((m) => state.strength[m.id] - before[m.id] >= 0.5).map((m) => ({
      id: m.id,
      name: m.name,
      from: Math.round(before[m.id]),
      to: Math.round(state.strength[m.id]),
    }));
    return {
      seconds: e.totalAcc,
      done: counted.map(({ item, ex, done }) => ({ item, done, sets: setsOf(item.plan) })),
      notCounted: e.workout.exercises.filter((_, i) => !countedIdx.has(i) && (e.finished[i] || 0) > 0),
      before,
      after: state.strength,
      state,
      grown,
      saved,
      early: e.early,
    };
  }

  function finish(early) {
    const e = eng.current;
    if (!e || e.ended) return;
    e.ended = true;
    e.early = early;
    if (e.totalSince != null) {
      e.totalAcc += nowS() - e.totalSince;
      e.totalSince = null;
    }
    e.since = null;
    say(early ? 'Workout ended. Well done.' : 'Workout done. Great job.');
    if (!early) finishChime();
    releaseScreen();
    setConfirmEnd(false);
    setSummary(saveResult(e));
    recordWorkoutHeart({ crewId, seconds: e.totalAcc, level: e.workout.level }); // heart rate response, by itself
    setPhase('done');
  }

  function advance() {
    const e = eng.current;
    if (!e || e.paused || e.ended) return;
    for (let guard = 0; guard < 50; guard += 1) {
      const step = e.steps[e.i];
      const el = getElapsed();
      const dur = stepSeconds(step);
      if (step.type === 'work' && el < dur) {
        if (step.reps && step.reps > 3 && !e.flags.last3 && Math.floor(el / step.tempo) >= step.reps - 3) {
          e.flags.last3 = true;
          say('Last 3 reps!');
        }
        if (!step.reps && dur > 15 && !e.flags.last10 && dur - el <= 10) {
          e.flags.last10 = true;
          say('Last 10 seconds!');
        }
      }
      // Soft 3-2-1 beeps in the last 3 seconds of every rest (so before every set after the first).
      if (step.type === 'rest' && el < dur) {
        const left = Math.ceil(dur - el);
        if (left <= 3 && left >= 1 && !e.flags[`beep${left}`]) {
          e.flags[`beep${left}`] = true;
          countBeep(left);
        }
      }
      if (el < dur) break;
      if (step.type === 'work') e.finished[step.ex] = (e.finished[step.ex] || 0) + 1;
      if (e.i + 1 >= e.steps.length) {
        finish(false);
        break;
      }
      enter(e.i + 1, el - dur);
    }
  }

  // ---------- Buttons ----------
  function start() {
    const steps = buildSteps(planned.exercises, demo);
    const t = nowS();
    eng.current = { workout: planned, steps, i: 0, acc: 0, since: t, paused: false, totalAcc: 0, totalSince: t, finished: {}, flags: {} };
    setPhase('running');
    unlockAudio(); // inside the tap, for iPhone
    enter(0); // spoken inside the tap: this unlocks speech on iPhone
    lockScreen();
  }

  function togglePause() {
    const e = eng.current;
    if (!e || e.ended) return;
    const t = nowS();
    if (e.paused) {
      e.paused = false;
      e.since = t;
      e.totalSince = t;
      say('Go.');
    } else {
      e.acc += t - e.since;
      e.since = null;
      e.totalAcc += t - e.totalSince;
      e.totalSince = null;
      e.paused = true;
      say('Paused.');
    }
    rerender();
  }

  function skip() {
    const e = eng.current;
    if (!e || e.ended) return;
    if (e.i + 1 >= e.steps.length) finish(false);
    else enter(e.i + 1);
    rerender();
  }

  function toggleVoice() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }

  function retrySave() {
    const ok = writeLocal(twinKey(crewId), summary.state);
    setSummary({ ...summary, saved: ok });
  }

  // Tick 4 times a second while running (advance only reads refs, so one interval is enough).
  useEffect(() => {
    if (phase !== 'running') return undefined;
    const id = setInterval(() => {
      advance();
      rerender();
    }, 250);
    return () => clearInterval(id);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // The wake lock is dropped when the page is hidden; take it again on return.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && phase === 'running') lockScreen();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [phase, lockScreen]);

  // Leaving the page stops the voice and the wake lock.
  useEffect(
    () => () => {
      stopSpeaking();
      releaseScreen();
    },
    [releaseScreen],
  );

  const demoLine = demo && <p className={s.demoLine}>Demo mode</p>;
  const voiceButton = (
    <Button variant="text" aria-pressed={!muted} onClick={toggleVoice}>
      {muted ? 'Sound off' : 'Sound on'}
    </Button>
  );

  // ---------- Loading, error, empty ----------
  if (phase === 'ready') {
    const header = <ScreenHeader backTo={`/body/muscles${demo ? '?demo=1' : ''}`} backLabel="Your muscles" title="Workout with your twin" />;
    if (inputs.status === 'loading') {
      return (
        <main className={s.page}>
          {header}
          <p className={s.note} role="status">
            Getting today's workout…
          </p>
        </main>
      );
    }
    if (inputs.status === 'error' || !planned) {
      return (
        <main className={s.page}>
          {header}
          <p className={s.error} role="alert">
            Today's workout can't load right now.
          </p>
          <div>
            <Button variant="secondary" onClick={inputs.retry}>
              Try again
            </Button>
          </div>
        </main>
      );
    }
    if (planned.exercises.length === 0) {
      return (
        <main className={s.page}>
          {header}
          <p className={s.note}>Nothing is planned for today.</p>
          <Button to="/body/muscles">Back to your twin</Button>
        </main>
      );
    }
    const steps = buildSteps(planned.exercises, demo);
    return (
      <main className={s.page}>
        {header}
        {demoLine}
        <div>
          {planned.exercises.map((e) => (
            <ListRow key={e.key} title={e.name} subtitle={`${e.dose} · ${e.detail}`} right={<span className={s.minutes}>{e.minutes} min</span>} />
          ))}
        </div>
        <p className={s.total}>About {demo ? minutesText(totalSeconds(steps)) : `${planned.totalMinutes} min`}</p>
        <p className={s.note}>Your twin does each move with you. The voice starts when you tap Start.</p>
        <div className={s.single}>
          <Button onClick={start}>Start</Button>
        </div>
        <div>{voiceButton}</div>
      </main>
    );
  }

  // ---------- Summary ----------
  if (phase === 'done' && summary) {
    return <FinishSummary summary={summary} gender={gender} person={person} demoLine={demoLine} onRetrySave={retrySave} />;
  }

  // ---------- Running ----------
  const e = eng.current;
  const step = e.steps[e.i];
  const item = e.workout.exercises[step.ex];
  const el = getElapsed();
  const dur = stepSeconds(step);
  const next = e.steps[e.i + 1];
  let nextText = 'Next: finish';
  if (next && next.type === 'rest') nextText = `Next: ${next.label} ${next.seconds >= 120 ? `${Math.round(next.seconds / 60)} min` : `${next.seconds} s`}`;
  else if (next) {
    const nextItem = e.workout.exercises[next.ex];
    nextText = `Next: ${nextItem.name}${next.sets > 1 ? `, ${next.unit.toLowerCase()} ${next.set}` : ''}`;
  }
  const isRest = step.type === 'rest';
  const stillRest = isRest && step.move === 'rest'; // easy pedaling keeps the twin moving
  const reps = step.reps ? Math.min(step.reps, Math.floor(el / step.tempo)) : null;
  const title = isRest ? step.label : item.name;
  const eyebrow = isRest ? 'Rest' : step.sets > 1 ? `${step.unit} ${step.set} of ${step.sets}` : item.dose;
  const counter = reps != null ? `${reps} / ${step.reps}` : clock(dur - el);
  const unitWord = reps != null ? 'reps' : isRest ? 'rest' : 'left';
  const status = `${title}. ${eyebrow}.`;
  const needed = !isRest && step.sets > 1 ? neededSets(item.plan) : null;

  // Muscles this exercise trains, glowing in their strength color on the moving twin.
  const fills = Object.fromEntries(mainMusclesOf(item.exerciseId, EXERCISES).map((m) => [m.id, fillOf(twin.model.strength[m.id])]));
  // When this view can't show the trained muscles (e.g. the back on the front view), say where to look.
  const targetIds = Object.keys(fills);
  let hiddenHint = '';
  if (targetIds.length && !targetIds.some((id) => VISIBLE[view].includes(id))) {
    const better = VIEWS.find((v) => targetIds.some((id) => VISIBLE[v.id].includes(id)) && v.id !== 'side') || VIEWS[1];
    const names = MUSCLES.filter((m) => targetIds.includes(m.id)).map((m) => m.name.toLowerCase());
    hiddenHint = `Switch to ${better.label} to see the ${names.join(' and ')} working.`;
  }

  // Top bar: how far each exercise has got (passed sets plus the current one).
  const parts = e.workout.exercises.map((_, ex) => {
    const works = e.steps.map((st, idx) => ({ st, idx })).filter((x) => x.st.type === 'work' && x.st.ex === ex);
    let done = works.filter((x) => x.idx < e.i).length;
    if (step.type === 'work' && step.ex === ex) done += Math.min(1, el / dur);
    return works.length ? done / works.length : 0;
  });

  // Rest: the next set, for the Next up card.
  const nextWork = isRest ? e.steps.slice(e.i + 1).find((st) => st.type === 'work') : null;
  const nextWorkItem = nextWork ? e.workout.exercises[nextWork.ex] : null;

  const counterBlock = (
    <>
      <span className={s.counter}>{counter}</span>
      <span className={s.counterUnit}>{unitWord}</span>
    </>
  );

  return (
    <main className={s.workoutPage}>
      <SegmentBar parts={parts} names={e.workout.exercises.map((x) => x.key)} />
      {demoLine}
      <p className={s.eyebrowLine}>{eyebrow}</p>
      <h1 className={s.exerciseName}>{title}</h1>
      <p className={s.srOnly} role="status">
        {status}
      </p>

      {stillRest ? (
        <>
          <BreathingRing getElapsed={getElapsed} running={!e.paused}>
            {counterBlock}
          </BreathingRing>
          <NextUp item={nextWorkItem} step={nextWork} muscles={nextWorkItem ? mainMusclesOf(nextWorkItem.exerciseId, EXERCISES) : []} />
        </>
      ) : (
        <>
          <div className={s.chips} role="group" aria-label="Twin view">
            {VIEWS.map((v) => (
              <Chip key={v.id} selected={view === v.id} onClick={() => changeView(v.id)}>
                {v.label}
              </Chip>
            ))}
          </div>
          <div className={s.twinStage}>
            <WorkoutTwin
              move={step.move}
              tempo={step.tempo}
              getElapsed={getElapsed}
              running={!e.paused}
              fills={fills}
              person={person}
              view={view}
              label={isRest ? 'Your twin resting' : `Your twin doing ${item.name}, ${view} view`}
            />
          </div>
          {hiddenHint && <p className={s.note}>{hiddenHint}</p>}
          <ProgressRing value={el / dur} label={`${counter} ${unitWord}`}>
            {counterBlock}
          </ProgressRing>
          <p className={s.next}>{nextText}</p>
        </>
      )}
      {e.paused && <p className={s.note}>Paused</p>}
      {needed && step.set === 1 && <p className={s.note}>Counts once {needed} of {step.sets} sets are done.</p>}

      {confirmEnd ? (
        <div className={s.confirm} role="group" aria-label="End workout">
          <p className={s.confirmText}>End workout? Finished exercises are saved.</p>
          <div className={s.controls}>
            <Button onClick={() => setConfirmEnd(false)}>Keep going</Button>
            <Button variant="secondary" onClick={() => finish(true)}>
              End
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className={s.controls}>
            <Button onClick={togglePause}>{e.paused ? 'Resume' : 'Pause'}</Button>
            <Button variant="secondary" onClick={skip}>
              Skip
            </Button>
          </div>
          <div className={s.controlsRow}>
            <Button variant="text" onClick={() => setConfirmEnd(true)}>
              End
            </Button>
            {voiceButton}
          </div>
        </>
      )}
    </main>
  );
}
