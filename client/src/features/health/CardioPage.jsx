// Cardiovascular and fluid health (owner: Habiba). Route /health/cardio.
// Heart rate, blood pressure, exercise response, an educational note on standing up after microgravity, and fluid-shift symptoms.
import { useState } from 'react';
import Button from '../../shared/Button.jsx';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import StatusLabel from '../../shared/StatusLabel.jsx';
import { useSession } from '../../shared/session.js';
import SavedNote from '../mood-face/SavedNote.jsx';
import BloodPressureLog from './BloodPressureLog.jsx';
import ExerciseResponse from './ExerciseResponse.jsx';
import SymptomLog from './SymptomLog.jsx';
import TrendChart from './TrendChart.jsx';
import { makeSignal } from './healthModel.js';
import { readEntries } from './storage.js';
import useHealthData from './useHealthData.js';
import s from './styles.module.css';

export default function CardioPage() {
  const session = useSession();
  const crewId = session?.id;
  const { state, retry } = useHealthData(crewId);
  const [bp, setBp] = useState(() => readEntries('bp', crewId));
  const [exercise] = useState(() => readEntries('exercise', crewId));
  const [symptoms, setSymptoms] = useState(() => readEntries('symptoms', crewId));

  const ready = state.phase === 'ready';
  const hr = ready ? state.today.vitals.heartRateBpm : null;
  const hrBase = ready ? state.baseline.restingHeartRateBpm : null;
  const hrStatus = ready ? makeSignal({ id: 'hr', label: 'Heart rate', value: hr, baseline: hrBase, dir: 'up', watchAt: 0.08, actAt: 0.15, source: 'simulated' })?.status ?? 'stable' : 'stable';

  return (
    <main>
      <ScreenHeader backTo="/health" backLabel="Health profile" eyebrow="Heart and fluids" title="Cardiovascular and fluid health" />

      {state.phase === 'loading' && <p className={s.muted} role="status">Loading…</p>}
      {state.phase === 'error' && (
        <div className={s.notice} role="alert">
          <p>{state.message}</p>
          <Button variant="secondary" onClick={retry}>Try again</Button>
        </div>
      )}

      {ready && (
        <>
          {state.saved && <SavedNote />}

          <section className={s.block} aria-labelledby="hr-title">
            <h2 id="hr-title" className={s.heading}>Heart rate</h2>
            <p className={s.big}>
              <span className={s.num}>{hr} bpm</span>
              <span className={s.muted}> · usual <span className={s.num}>{hrBase} bpm</span></span>
            </p>
            <p><StatusLabel status={hrStatus} /></p>
            <TrendChart
              lines={[{ id: 'hr', label: 'Resting heart rate', points: state.history.filter((d) => Number.isFinite(d.restingHeartRateBpm)).map((d) => ({ x: d.missionDay, y: d.restingHeartRateBpm, source: 'simulated' })) }]}
              baseline={hrBase}
            />
            <p className={s.caveat}>
              The phone camera and microphone in NABD cannot measure heart rate or blood pressure.
            </p>
          </section>

          <BloodPressureLog crewId={crewId} today={state.today} baseline={state.baseline} history={state.history} entries={bp} onSaved={setBp} />

          <ExerciseResponse entries={exercise} />
          <SymptomLog crewId={crewId} today={state.today} entries={symptoms} onSaved={setSymptoms} />

        </>
      )}
    </main>
  );
}
