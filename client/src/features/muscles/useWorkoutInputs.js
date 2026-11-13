// Loads the inputs for Today's workout (owner: Layal): her check-ins (GET /api/mood) and, only for a female
// avatar in cycle-tracking mode, her cycle (GET /api/womens/cycle). Everything is worked out on the phone;
// nothing about the workout or the cycle is sent or saved anywhere.
// Returns { status: 'loading' | 'ready' | 'error', energy, cycle, cycleError, retry }.
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../shared/api.js';
import { todayIso } from './storage.js';
import { cycleAdjustment, energyLevel } from './todaysWorkout.js';

// Her period mode from Profile and settings: localStorage `nabd-cycle-mode-<crewId>`, saved as JSON
// ("cycle" / "suppression"); an older plain value still counts. null when nothing is saved.
function savedCycleMode(crewId) {
  try {
    const raw = localStorage.getItem(`nabd-cycle-mode-${crewId}`);
    if (raw === null) return null;
    let value = raw;
    try {
      value = JSON.parse(raw);
    } catch {
      // plain value
    }
    return value === 'suppression' || value === 'cycle' ? value : null;
  } catch {
    return null;
  }
}

export default function useWorkoutInputs(crewId, gender) {
  const [state, setState] = useState({ status: 'loading', energy: null, cycle: null, cycleError: false });
  const alive = useRef(true);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading' }));
    const today = todayIso();
    const id = encodeURIComponent(crewId || '');

    let checkins;
    try {
      checkins = await apiFetch(`/api/mood?crewId=${id}`);
    } catch {
      if (alive.current) setState({ status: 'error', energy: null, cycle: null, cycleError: false });
      return;
    }

    let cycle = null;
    let cycleError = false;
    const saved = savedCycleMode(crewId);
    if (gender === 'female' && saved !== 'suppression') {
      try {
        const res = await apiFetch(`/api/womens/cycle?crewId=${id}`);
        if (!res || !res.data) throw new Error('missing');
        const mode = saved || (res.data.activeMode === 'cycle' ? 'cycle' : 'suppression');
        cycle = cycleAdjustment({ gender, mode, data: res.data, logs: res.logs || [], today });
      } catch {
        cycleError = true; // the workout still shows, without a cycle change
      }
    }

    if (alive.current) setState({ status: 'ready', energy: energyLevel(checkins, today), cycle, cycleError });
  }, [crewId, gender]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  return { ...state, retry: load };
}
