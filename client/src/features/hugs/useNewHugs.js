import { useEffect, useRef, useState } from 'react';
import { fetchNewHugs } from './hugApi.js';

// Polls GET /api/hugs/new?since= every few seconds while the page is open.
// One request at a time; stops when the page unmounts; skips checks while the tab is hidden.
export function useNewHugs({ intervalMs = 3000, onHug } = {}) {
  const [hugs, setHugs] = useState([]); // live hugs received since the page opened
  const [offline, setOffline] = useState(false);
  const sinceRef = useRef(new Date().toISOString());
  const busyRef = useRef(false);
  const onHugRef = useRef(onHug);
  onHugRef.current = onHug;

  useEffect(() => {
    let stopped = false;
    async function check() {
      if (busyRef.current || document.hidden) return;
      busyRef.current = true;
      try {
        const fresh = await fetchNewHugs(sinceRef.current);
        if (stopped) return;
        setOffline(false);
        if (fresh.length > 0) {
          sinceRef.current = fresh[fresh.length - 1].createdAt;
          setHugs((old) => [...old, ...fresh]);
          fresh.forEach((h) => onHugRef.current?.(h));
        }
      } catch {
        if (!stopped) setOffline(true);
      } finally {
        busyRef.current = false;
      }
    }
    const id = setInterval(check, intervalMs);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return { hugs, offline };
}
