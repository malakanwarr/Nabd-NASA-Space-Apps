import { useCallback, useEffect, useRef, useState } from 'react';

// Hold a button for holdMs; progress goes 0 -> 1, then onComplete fires once.
// Releasing early cancels. Space and Enter work as a hold.
export function useHoldToSend({ holdMs = 1000, onComplete, disabled = false }) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(0);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    doneRef.current = false;
    setProgress(0);
  }, []);

  const tick = useCallback(
    (now) => {
      const p = Math.min((now - startRef.current) / holdMs, 1);
      setProgress(p);
      if (p >= 1) {
        rafRef.current = null;
        doneRef.current = true;
        onCompleteRef.current?.();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [holdMs],
  );

  const start = useCallback(() => {
    if (disabledRef.current || rafRef.current || doneRef.current) return;
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => stop, [stop]);

  const bind = {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onContextMenu: (e) => e.preventDefault(),
    onKeyDown: (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        start();
      }
    },
    onKeyUp: stop,
    onBlur: stop,
  };
  return { progress, bind };
}
