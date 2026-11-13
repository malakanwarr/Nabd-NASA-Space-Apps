// Loads everything the health screens need (owner: Habiba). Sample data and check-ins come through shared/api.js,
// so with no connection the copies saved on the phone are used and `saved` is true.
import { useEffect, useState } from 'react';
import { apiFetch, wasSavedCopy } from '../../shared/api.js';
import { getSampleData } from '../../shared/sampleData.js';

export default function useHealthData(crewId) {
  const [state, setState] = useState({ phase: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    const moodPath = `/api/mood?crewId=${encodeURIComponent(crewId || '')}`;
    const paths = ['/api/data/today', '/api/data/baseline', '/api/data/history-14-days', '/api/data/reaction-tests', moodPath];
    Promise.allSettled([
      getSampleData('today'),
      getSampleData('baseline'),
      getSampleData('history-14-days'),
      getSampleData('reaction-tests'),
      apiFetch(moodPath),
    ]).then(([today, baseline, history, reactionTests, checkins]) => {
      if (!alive) return;
      const required = [today, baseline, history];
      const failed = required.find((r) => r.status === 'rejected');
      if (failed) {
        setState({ phase: 'error', message: failed.reason?.message || 'Something went wrong. Please try again.' });
        return;
      }
      setState({
        phase: 'ready',
        saved: paths.some(wasSavedCopy),
        today: today.value,
        baseline: baseline.value,
        history: history.value.days || [],
        reactionTests: reactionTests.status === 'fulfilled' ? reactionTests.value : null,
        checkins: checkins.status === 'fulfilled' && Array.isArray(checkins.value) ? checkins.value : [],
      });
    });
    return () => {
      alive = false;
    };
  }, [crewId, attempt]);

  return { state, retry: () => setAttempt((n) => n + 1) };
}
