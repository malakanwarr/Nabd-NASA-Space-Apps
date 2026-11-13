// The four scores after the check-in (owner: Habiba). Shown at the top of the Results page, instead of one energy score.
// Cognitive readiness and emotional wellbeing come from today's face, voice and reaction time. Physical readiness comes
// from the heart and blood pressure sensors. Sleep recovery comes from the sleep questions. Each score is out of 100,
// compared with the astronaut's own normal: 80 and over is in her normal range.
import { useEffect, useMemo, useState } from 'react';
import Button from '../../shared/Button.jsx';
import Chip from '../../shared/Chip.jsx';
import StatusLabel from '../../shared/StatusLabel.jsx';
import { getSampleData } from '../../shared/sampleData.js';
import { formatBaseline, formatValue, scoresForDay } from './healthModel.js';
import { readEntries } from './storage.js';
import TrendChart from './TrendChart.jsx';
import s from './styles.module.css';

const DETAIL = {
  physical: { href: '/health/cardio', label: 'Heart and fluid details' },
  sleep: { href: '/health/sleep', label: 'Sleep details' },
};

function whyLine(dimension) {
  if (dimension.status === 'unknown') return 'Not enough data yet.';
  const worst = dimension.worst;
  if (!worst || worst.status === 'stable') return 'Everything we measured is in your normal range.';
  const value = worst.displayValue ?? formatValue(worst);
  const usual = worst.displayBaseline ?? formatBaseline(worst);
  return `${worst.label} is ${value}. Your usual is ${usual}.`;
}

// The tiles and the chart for already worked-out scores (kept separate so it can be checked on its own).
export function ScoresView({ tiles, daily }) {
  const [picked, setPicked] = useState(null);
  const lowest = [...tiles].filter((d) => d.score !== null).sort((a, b) => a.score - b.score)[0];
  const chosen = tiles.find((d) => d.id === (picked ?? lowest?.id)) ?? tiles[0];
  return (
    <>
      <section aria-label="Your four scores">
        <div className={s.scoreGrid}>
          {tiles.map((d) => (
            <article key={d.id} className={s.tile}>
              <h2 className={s.tileLabel}>{d.title}</h2>
              {d.score === null ? (
                <p className={s.tileScore}>–</p>
              ) : (
                <p className={`${s.tileScore} ${s[d.status]}`}>{d.score}<small>/100</small></p>
              )}
              {d.score !== null && <StatusLabel status={d.status} />}
              <p className={s.tileWhy}>{whyLine(d)}</p>
              {DETAIL[d.id] && <Button variant="text" to={DETAIL[d.id].href}>{DETAIL[d.id].label}</Button>}
            </article>
          ))}
        </div>
        <p className={s.muted}>Each score is compared with your own normal. 80 and over is in your normal range.</p>
      </section>

      <section className={s.block} aria-label="Your scores over the last days">
        <h2 className={s.heading}>Your scores, last days</h2>
        <div className={s.chips} role="group" aria-label="Choose a score">
          {tiles.map((d) => (
            <Chip key={d.id} selected={d.id === chosen.id} onClick={() => setPicked(d.id)}>{d.title}</Chip>
          ))}
        </div>
        {daily[chosen.id].length >= 2 ? (
          <TrendChart
            lines={[{ id: 'score', label: `${chosen.title} score`, points: daily[chosen.id] }]}
            baseline={80}
            baselineNote="The dashed line is where your normal range starts."
            height={160}
          />
        ) : (
          <p className={s.muted}>Not enough days yet to draw this one.</p>
        )}
      </section>
    </>
  );
}

// shown: the check-in on screen (face, voice, reactionMs, missionDay). known: the saved check-ins, oldest first.
export default function HealthScores({ shown, known, today, baseline, crewId }) {
  const [data, setData] = useState({ phase: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([getSampleData('history-14-days'), getSampleData('reaction-tests').catch(() => null)])
      .then(([history, reactionTests]) => {
        if (alive) setData({ phase: 'ready', history: history.days || [], reactionTests });
      })
      .catch(() => {
        if (alive) setData({ phase: 'error' });
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const view = useMemo(() => {
    if (data.phase !== 'ready') return null;
    const sleepEntries = readEntries('sleep', crewId);
    const base = { today, baseline, history: data.history, reactionTests: data.reactionTests, sleepEntries };
    const checkinFor = (day) => (day === shown.missionDay ? shown : known.find((row) => row.missionDay === day) ?? null);

    const tiles = scoresForDay({ ...base, day: shown.missionDay, checkin: shown });
    const days = data.history.map((h) => h.missionDay).filter((d) => d <= today.missionDay).slice(-7);
    const daily = { cognitive: [], physical: [], sleep: [], emotional: [] };
    days.forEach((day) => {
      const scored = scoresForDay({ ...base, day, checkin: checkinFor(day) });
      scored?.forEach((d) => {
        if (d.score !== null) daily[d.id].push({ x: day, y: d.score, source: 'measured' });
      });
    });
    return { tiles, daily };
  }, [data, shown, known, today, baseline, crewId]);

  if (data.phase === 'loading') return <p className={s.muted} role="status">Working out your four scores…</p>;
  if (data.phase === 'error' || !view?.tiles) {
    return (
      <div className={s.notice} role="alert">
        <p>We couldn't work out your four scores right now.</p>
        <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
      </div>
    );
  }

  return <ScoresView tiles={view.tiles} daily={view.daily} />;
}
