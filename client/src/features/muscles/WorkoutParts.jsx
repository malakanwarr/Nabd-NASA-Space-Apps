// Small parts of the workout screen (owner: Layal): progress ring, breathing ring, Next up card, segment bar.
// Theme variables only; everything stays still with prefers-reduced-motion.
import { useEffect, useState } from 'react';
import { MUSCLES } from './muscleModel.js';
import { useReducedMotion } from './WorkoutTwin.jsx';
import s from './styles.module.css';

const R = 44;
const CIRC = 2 * Math.PI * R;

// A ring that fills as the set (or rest) goes, with the counter inside.
export function ProgressRing({ value, children, label }) {
  const v = Math.min(1, Math.max(0, value || 0));
  return (
    <div className={s.ringWrap}>
      <svg className={s.ring} viewBox="0 0 100 100" aria-hidden="true">
        <circle className={s.ringTrack} cx="50" cy="50" r={R} />
        <circle
          className={s.ringFill}
          cx="50"
          cy="50"
          r={R}
          strokeDasharray={CIRC.toFixed(2)}
          strokeDashoffset={(CIRC * (1 - v)).toFixed(2)}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className={s.ringCenter} aria-label={label}>
        {children}
      </div>
    </div>
  );
}

const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);

// Rest: a slow breathing circle, about 4 s in and 4 s out, timed by the workout clock (Pause freezes it).
export function BreathingRing({ getElapsed, running, children }) {
  const reduced = useReducedMotion();
  const [t, setT] = useState(0);

  useEffect(() => {
    if (reduced) return undefined;
    let frame;
    const loop = () => {
      setT(getElapsed() % 8);
      if (running) frame = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frame);
  }, [getElapsed, running, reduced]);

  const inhale = t < 4;
  const scale = reduced ? 1 : inhale ? 0.72 + 0.28 * ease(t / 4) : 1 - 0.28 * ease((t - 4) / 4);
  const words = reduced ? 'Breathe in… breathe out' : inhale ? 'Breathe in…' : 'Breathe out…';

  return (
    <div className={s.breathe}>
      <div className={s.ringWrap}>
        <svg className={s.ring} viewBox="0 0 100 100" aria-hidden="true">
          <circle className={s.breatheTrack} cx="50" cy="50" r={R} />
          <circle className={s.breatheFill} cx="50" cy="50" r={R} style={{ transform: `scale(${scale.toFixed(3)})` }} />
        </svg>
        <div className={s.ringCenter}>{children}</div>
      </div>
      <p className={s.breatheWords}>{words}</p>
    </div>
  );
}

export function mainMusclesOf(exerciseId, exercises) {
  const ex = exercises.find((x) => x.id === exerciseId);
  return ex ? MUSCLES.filter((m) => ex.trains[m.id] === 1) : [];
}

// The next set: exercise name, which set, the dose, and the muscles it trains as small chips.
export function NextUp({ item, step, muscles }) {
  if (!item || !step) return null;
  return (
    <section className={s.nextCard} aria-label="Next up">
      <p className={s.nextLabel}>Next up</p>
      <p className={s.nextName}>{item.name}</p>
      <p className={s.note}>
        {step.sets > 1 ? `${step.unit} ${step.set} of ${step.sets} · ` : ''}
        {item.dose} · {item.detail}
      </p>
      {muscles.length > 0 && (
        <ul className={s.reasons} aria-label="Muscles it trains">
          {muscles.map((m) => (
            <li key={m.id} className={s.reason}>
              {m.name}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Slim bar at the top: one segment per exercise, filling as she goes.
export function SegmentBar({ parts, names }) {
  const overall = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
  return (
    <div
      className={s.segments}
      role="progressbar"
      aria-label="Workout progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(overall * 100)}
    >
      {parts.map((p, i) => (
        <div key={names[i] || i} className={s.segment}>
          <div className={s.segmentFill} style={{ width: `${Math.round(Math.min(1, p) * 100)}%` }} />
        </div>
      ))}
    </div>
  );
}
