// Sleep and recovery (owner: Habiba). Route /health/sleep.
// Duration, timing, regularity, a morning questionnaire, and sleep length against reaction time.
import { useMemo, useState } from 'react';
import Button from '../../shared/Button.jsx';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import StatusLabel from '../../shared/StatusLabel.jsx';
import { useSession } from '../../shared/session.js';
import SavedNote from '../mood-face/SavedNote.jsx';
import ScatterPlot from './ScatterPlot.jsx';
import SleepQuestionnaire from './SleepQuestionnaire.jsx';
import SourceTag from './SourceTag.jsx';
import TrendChart from './TrendChart.jsx';
import { bedLabel, buildProfile, describeCorrelation, fmtClock, formatBaseline, formatValue, mean, regularity, sleepVsReaction } from './healthModel.js';
import { readEntries } from './storage.js';
import useHealthData from './useHealthData.js';
import s from './styles.module.css';

const oneDecimal = (v) => v.toFixed(1);

export default function SleepPage() {
  const session = useSession();
  const crewId = session?.id;
  const { state, retry } = useHealthData(crewId);
  const [entries, setEntries] = useState(() => readEntries('sleep', crewId));

  const view = useMemo(() => {
    if (state.phase !== 'ready') return null;
    const profile = buildProfile({ today: state.today, baseline: state.baseline, history: state.history, reactionTests: state.reactionTests, checkins: state.checkins, sleepEntries: entries });
    const nights = profile.nights;
    const reg = regularity(nights);
    const recent = nights.slice(-7);
    const sleepDim = profile.dimensions.find((d) => d.id === 'sleep');
    const pattern = sleepVsReaction(nights);
    const night = nights.find((n) => n.missionDay === state.today.missionDay);
    const todayCheckin = state.checkins.find((c) => c.missionDay === state.today.missionDay && Number.isFinite(c.reactionMs));
    return {
      profile,
      nights,
      reg,
      sleepDim,
      pattern,
      weekAvg: mean(recent.map((n) => n.hours)),
      bedAvg: mean(recent.map((n) => n.bedMin)),
      wakeAvg: mean(recent.map((n) => n.wakeMin)),
      todayPoint: night && todayCheckin ? { x: night.hours, y: todayCheckin.reactionMs } : null,
      todayEntry: entries.find((e) => e.missionDay === state.today.missionDay) ?? null,
    };
  }, [state, entries]);

  const duration = view?.sleepDim.signals.find((sig) => sig.id === 'duration');

  return (
    <main>
      <ScreenHeader backTo="/health" backLabel="Health profile" eyebrow="Sleep and recovery" title="How you slept" />

      {state.phase === 'loading' && <p className={s.muted} role="status">Loading your sleep…</p>}
      {state.phase === 'error' && (
        <div className={s.notice} role="alert">
          <p>{state.message}</p>
          <Button variant="secondary" onClick={retry}>Try again</Button>
        </div>
      )}

      {view && (
        <>
          {state.saved && <SavedNote />}

          <section className={s.block} aria-labelledby="sleep-now">
            <h2 id="sleep-now" className={s.heading}>Last night</h2>
            {duration ? (
              <>
                <p className={s.big}>
                  <span className={s.num}>{formatValue(duration)}</span>
                  <span className={s.muted}> · usual <span className={s.num}>{formatBaseline(duration)}</span></span>
                </p>
                <p><StatusLabel status={duration.status} /></p>
                <p className={s.muted}>
                  This week you averaged <span className={s.num}>{view.weekAvg.toFixed(1)} h</span> a night.
                </p>
                {duration.source !== 'simulated' && <p className={s.meta}><SourceTag kind={duration.source} /></p>}
              </>
            ) : (
              <p className={s.muted}>No sleep data yet.</p>
            )}
          </section>

          <section className={s.block} aria-labelledby="sleep-form">
            <h2 id="sleep-form" className={s.heading}>Morning questions</h2>
            <p className={s.muted}>
              {view.todayEntry
                ? 'You answered today. You can change your answers.'
                : 'Six quick questions. Your answers are used for today. They stay on this phone.'}
            </p>
            <SleepQuestionnaire
              key={view.todayEntry ? 'answered' : 'new'}
              crewId={crewId}
              missionDay={state.today.missionDay}
              date={state.today.date}
              existing={view.todayEntry}
              onSaved={setEntries}
            />
          </section>

          <section className={s.block} aria-labelledby="sleep-duration">
            <h2 id="sleep-duration" className={s.heading}>Sleep duration</h2>
            <TrendChart
              lines={[{ id: 'hours', label: 'Sleep (hours)', points: view.nights.map((n) => ({ x: n.missionDay, y: n.hours, source: n.source })) }]}
              baseline={state.baseline.sleepHours}
              yFormat={oneDecimal}
            />
          </section>

          <section className={s.block} aria-labelledby="sleep-timing">
            <h2 id="sleep-timing" className={s.heading}>Sleep timing</h2>
            <p className={s.muted}>
              Over the last 7 nights you went to bed around <span className={s.num}>{bedLabel(view.bedAvg)}</span> and woke up around{' '}
              <span className={s.num}>{fmtClock(view.wakeAvg)}</span>. Your schedule says wake-up at 07:00.
            </p>
            <p className={s.seriesLabel}>Bedtime</p>
            <TrendChart lines={[{ id: 'bed', label: 'Bedtime', points: view.nights.map((n) => ({ x: n.missionDay, y: n.bedMin, source: n.source })) }]} yFormat={bedLabel} height={140} />
            <p className={s.seriesLabel}>Wake-up</p>
            <TrendChart lines={[{ id: 'wake', label: 'Wake-up', points: view.nights.map((n) => ({ x: n.missionDay, y: n.wakeMin, source: n.source })) }]} yFormat={fmtClock} height={140} />
            {view.nights.some((n) => n.source === 'self') && <p className={s.meta}><SourceTag kind="self" /></p>}
          </section>

          <section className={s.block} aria-labelledby="sleep-regular">
            <h2 id="sleep-regular" className={s.heading}>Regularity</h2>
            {view.reg ? (
              <>
                <p className={s.big}>{view.reg.label}</p>
                <p><StatusLabel status={view.reg.status} /></p>
                <p className={s.muted}>
                  In the last 7 nights your bedtime moved by about <span className={s.num}>{view.reg.bedSd} min</span> and your wake-up by about{' '}
                  <span className={s.num}>{view.reg.wakeSd} min</span>. Regular sleep times support a steady body clock.
                </p>
                <p className={s.meta}><SourceTag kind="estimated" /></p>
              </>
            ) : (
              <p className={s.muted}>We need at least 2 nights to measure this.</p>
            )}
          </section>

          <section className={s.block} aria-labelledby="sleep-reaction">
            <h2 id="sleep-reaction" className={s.heading}>Sleep and reaction time</h2>
            <ScatterPlot points={view.pattern.pairs.map((p) => ({ x: p.hours, y: p.ms }))} today={view.todayPoint} />
            <p>{describeCorrelation(view.pattern.r, view.pattern.n)}</p>
            {view.pattern.shortAvg !== null && view.pattern.normalAvg !== null && (
              <p className={s.muted}>
                After nights under 6.5 h ({view.pattern.shortCount} days) your reaction averaged <span className={s.num}>{view.pattern.shortAvg} ms</span>. After longer
                nights ({view.pattern.normalCount} days) it averaged <span className={s.num}>{view.pattern.normalAvg} ms</span>. Your usual is{' '}
                <span className={s.num}>{state.baseline.reactionTimeMs} ms</span>.
              </p>
            )}
            <p className={s.caveat}>
              This shows a pattern, not a cause. Days that go together are not proof that one caused the other, and a reaction test on its own is not a diagnosis
              of fatigue.
            </p>
            {view.todayPoint && <p className={s.meta}><SourceTag kind="measured" /></p>}
          </section>

        </>
      )}
    </main>
  );
}
