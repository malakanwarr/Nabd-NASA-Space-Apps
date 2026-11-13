// Your muscles, /body/muscles (owner: Layal), opened from the Bones and muscles page. Step 1 of the exercise feature: the muscle digital twin.
// Prototype model (muscleModel.js). Saved on the phone only: localStorage `nabd-muscles-<crewId>`,
// shape { version, updatedOn, strength: {muscleId: 0-100}, workouts: [{exerciseId, date, at}] } (newest first).
// On open, the daily drop is applied from updatedOn to today and saved. Nothing loads from the network,
// so there is no loading state; with nothing saved, the twin starts from the sample model (empty state).
// Tapping a muscle opens a callout card beside it (an HTML element over the figure, joined by a thin line).
// Tap the muscle again, tap empty space, press Escape or the close button to close it.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import Button from '../../shared/Button.jsx';
import Chip from '../../shared/Chip.jsx';
import { useSession } from '../../shared/session.js';
import MuscleFigure, { VB_H, VB_W, anchorOf, fillOf, groupsFor } from './MuscleFigure.jsx';
import {
  STATUS,
  applyDrop,
  completeWorkout,
  exercisesFor,
  freshState,
  muscleById,
  normalize,
  statusOf,
} from './muscleModel.js';
import { normalize as normalizeAvatars } from '../avatar/avatarOptions.js';
import { readLocal, todayIso, writeLocal } from './storage.js';
import TodaysWorkout from './TodaysWorkout.jsx';
import { focusMuscles, todaysWorkout } from './todaysWorkout.js';
import useWorkoutInputs from './useWorkoutInputs.js';
import s from './styles.module.css';

const VIEWS = [
  { id: 'front', label: 'Front' },
  { id: 'back', label: 'Back' },
];

// "Thighs", "Thighs and glutes", "Back, glutes and thighs"
function nameList(ids) {
  const names = ids.map((id, i) => (i === 0 ? muscleById(id).name : muscleById(id).name.toLowerCase()));
  if (names.length < 2) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function loadState(key) {
  const today = todayIso();
  const saved = normalize(readLocal(key, null), today);
  return { model: applyDrop(saved || freshState(today), today), empty: !saved };
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Body shape from her avatar (Make your avatar): people.you.gender. Nothing saved: female (the avatar default).
function readGender(crewId) {
  return normalizeAvatars(readLocal(`nabd-avatars-${crewId}`, null)).you.gender === 'male' ? 'male' : 'female';
}

export default function MusclesPage() {
  const session = useSession();
  const storageKey = `nabd-muscles-${session?.id}`;

  const [{ model, empty }, setLoaded] = useState(() => loadState(storageKey));
  const [gender] = useState(() => readGender(session?.id));
  const inputs = useWorkoutInputs(session?.id, gender);
  const workout =
    inputs.status === 'ready' ? todaysWorkout({ strength: model.strength, energy: inputs.energy, cycle: inputs.cycle }) : null;
  const focus = workout ? workout.focus : focusMuscles(model.strength);
  const [view, setView] = useState('front');
  const [selected, setSelected] = useState(null);
  const [exerciseId, setExerciseId] = useState(null);
  const [message, setMessage] = useState(null); // { kind: 'saved' | 'error' | 'hint', text }
  const [place, setPlace] = useState(null); // { top (px in the stage), lineY (viewBox units), minHeight }

  const stageRef = useRef(null);
  const cardRef = useRef(null);
  const headingRef = useRef(null);

  // Save once on open, so the daily drop counts from today next time. A failure here is quiet:
  // the twin still works for this visit, and a failed workout save shows the error in the card.
  useEffect(() => {
    writeLocal(storageKey, model); // the state as loaded (drop applied); later saves happen on workouts
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const muscle = selected ? muscleById(selected) : null;
  const exercises = muscle ? exercisesFor(muscle.id) : [];
  const picked = exercises.some((e) => e.id === exerciseId) ? exerciseId : null;

  function open(id) {
    setSelected(id);
    setExerciseId(null);
    setMessage(null);
  }

  function close(returnFocus) {
    const id = selected;
    setSelected(null);
    setMessage(null);
    if (returnFocus && id) stageRef.current?.querySelector(`[data-muscle="${id}"]`)?.focus();
  }

  function toggle(id) {
    if (id === selected) close(false);
    else open(id);
  }

  function changeView(next) {
    setView(next);
    if (selected && !groupsFor(next, gender).some((g) => g.id === selected)) close(false);
  }

  // Escape closes the card and returns focus to the muscle.
  useEffect(() => {
    if (!selected) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  // Move focus to the card's heading when a muscle opens, so screen readers read the card.
  useEffect(() => {
    if (selected) headingRef.current?.focus();
  }, [selected]);

  // Place the card beside the muscle: centered on it, kept inside the figure.
  useLayoutEffect(() => {
    if (!selected) {
      setPlace(null);
      return undefined;
    }
    function measure() {
      const stage = stageRef.current;
      const card = cardRef.current;
      const anchor = anchorOf(view, selected, gender);
      if (!stage || !card || !anchor) return;
      const unit = stage.clientWidth / VB_W; // px per viewBox unit
      const figureH = VB_H * unit;
      const h = card.offsetHeight;
      const top = clamp(anchor[1] * unit - h / 2, 0, Math.max(0, figureH - h));
      const edge = Math.min(20, h / unit / 2);
      const lineY = clamp(anchor[1], top / unit + edge, (top + h) / unit - edge);
      setPlace({ top, lineY, minHeight: Math.max(figureH, top + h) });
    }
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(stageRef.current);
    ro.observe(cardRef.current);
    return () => ro.disconnect();
  }, [selected, view, message, picked, gender]);

  function pickExercise(id) {
    setExerciseId(id);
    setMessage(null);
  }

  function complete() {
    if (!picked) {
      setMessage({ kind: 'hint', text: 'Pick the exercise you did first.' });
      return;
    }
    const { state, grown } = completeWorkout(model, picked, todayIso());
    setLoaded({ model: state, empty: false });
    if (writeLocal(storageKey, state)) {
      setMessage({ kind: 'saved', text: `Saved. ${nameList(grown)} got stronger.` });
    } else {
      setMessage({ kind: 'error', text: 'Could not save on this phone. Your workout is still shown.' });
    }
  }

  // Tapping empty space (anything that isn't the card or a muscle) closes the card.
  function onPageClick(e) {
    if (!selected) return;
    if (e.target.closest('[data-card]') || e.target.closest('[data-muscle]')) return;
    close(false);
  }

  const value = muscle ? model.strength[muscle.id] : 0;
  const status = STATUS[statusOf(value)];

  return (
    <main className={s.page} onClick={onPageClick}>
      <ScreenHeader backTo="/body/bones" backLabel="Bones and muscles" title="Your muscles" />

      <p className={s.note}>Prototype model. Untrained muscles slowly lose strength in space.</p>
      {empty && <p className={s.note}>Nothing logged yet. Your twin starts from the sample model.</p>}

      <section aria-label="Muscle twin" className={s.section}>
        <div className={s.chips}>
          {VIEWS.map((v) => (
            <Chip key={v.id} selected={view === v.id} onClick={() => changeView(v.id)}>
              {v.label}
            </Chip>
          ))}
        </div>
        <p className={s.note}>Tap a muscle to see its strength and NASA exercises.</p>

        <div className={s.stage} ref={stageRef} style={place ? { minHeight: `${place.minHeight}px` } : undefined}>
          <MuscleFigure view={view} gender={gender} focus={focus} strength={model.strength} selected={selected} onSelect={toggle} lineY={place?.lineY} />

          {muscle && (
            <section
              ref={cardRef}
              data-card
              className={s.card}
              style={{ top: `${place ? place.top : 0}px`, visibility: place ? 'visible' : 'hidden' }}
              aria-labelledby="muscle-card-title"
            >
              <button type="button" className={s.close} aria-label={`Close ${muscle.name}`} onClick={() => close(true)}>
                <span aria-hidden="true">×</span>
              </button>
              <h2 id="muscle-card-title" ref={headingRef} tabIndex={-1} className={s.cardTitle}>
                {muscle.name}
              </h2>
              <p className={s.cardStrength}>
                <span className={s.dot} style={{ background: fillOf(value) }} aria-hidden="true" />
                Strength {Math.round(value)} · {status.word}
              </p>

              <ul className={s.exercises} aria-label="NASA exercises">
                {exercises.map((ex) => (
                  <li key={ex.id}>
                    <button
                      type="button"
                      className={`${s.exercise} ${picked === ex.id ? s.exerciseOn : ''}`}
                      aria-pressed={picked === ex.id}
                      onClick={() => pickExercise(ex.id)}
                    >
                      <span className={s.exName}>{ex.name}</span>
                      <span className={s.exSets}>{ex.sets}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {picked && <p className={s.note}>{exercises.find((e) => e.id === picked).how}</p>}

              <div className={s.single}>
                <Button onClick={complete}>Workout completed</Button>
              </div>
              {message && (
                <p
                  className={message.kind === 'error' ? s.error : message.kind === 'saved' ? s.saved : s.note}
                  role={message.kind === 'error' ? 'alert' : 'status'}
                >
                  {message.text}
                </p>
              )}
            </section>
          )}
        </div>
      </section>

      <TodaysWorkout status={inputs.status} workout={workout} cycleError={inputs.cycleError} onRetry={inputs.retry} />
    </main>
  );
}
