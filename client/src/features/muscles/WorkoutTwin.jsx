// The moving twin in workout mode (owner: Layal). Draws twinDraw.js shapes; the loop position comes from the
// workout clock (getElapsed, in seconds), so reps on screen and the counter stay in step and Pause freezes it.
// fills: { muscleId: color } for the muscles this exercise trains; they glow and brighten at the top of each rep.
// With prefers-reduced-motion the twin stays still in its starting pose with a static glow; text and voice
// carry the workout.
import { Fragment, useEffect, useState } from 'react';
import { twinShapes } from './twinDraw.js';
import VisorFace from './VisorFace.jsx';
import s from './styles.module.css';

export function useReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches));
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

// person: her normalized avatar; her face is drawn in profile inside the visor.
// view: 'side' (default), 'front' or 'back'.
export default function WorkoutTwin({ move, tempo, getElapsed, running, label, fills = null, person = null, view = 'side' }) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (reduced) {
      setPhase(0);
      return undefined;
    }
    let frame;
    const loop = () => {
      setPhase((getElapsed() / tempo) % 1);
      if (running) frame = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frame);
  }, [move, tempo, getElapsed, running, reduced]);

  const p = reduced ? 0 : phase;
  const glow = reduced ? 0 : 0.5 - 0.5 * Math.cos(2 * Math.PI * p); // brightest at the top of the rep
  const highlight = fills && Object.keys(fills).length ? { fills, glow } : null;

  return (
    <svg className={s.twinMove} viewBox="0 -20 200 260" role="img" aria-label={label}>
      {twinShapes(move, p, highlight, view).map(({ el: El, cls, attrs, face }) => {
        const { key, ...rest } = attrs;
        return (
          <Fragment key={key}>
            <El className={s[cls]} {...rest} />
            {face && person && <VisorFace person={person} kind={face.kind} cx={face.cx} cy={face.cy} rx={face.rx} ry={face.ry} lean={face.lean} />}
          </Fragment>
        );
      })}
    </svg>
  );
}
