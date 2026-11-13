// One of the four health dimensions as a card (owner: Habiba). Cards are fine here: the four are compared and opened one by one.
import Button from '../../shared/Button.jsx';
import StatusLabel from '../../shared/StatusLabel.jsx';
import { formatBaseline, formatValue } from './healthModel.js';
import SourceTag from './SourceTag.jsx';
import TrendChart from './TrendChart.jsx';
import s from './styles.module.css';

function joinList(items) {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function sentence(dimension) {
  if (dimension.status === 'unknown') return 'Do your daily check-in to see this.';
  if (dimension.off.length === 0) return 'Everything we could measure is in your normal range.';
  const text = joinList(dimension.off);
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} ${dimension.off.length > 1 ? 'are' : 'is'} off your normal.`;
}

function changeWords(signal) {
  if (signal.changePct === null || signal.changePct === 0) return null;
  return `${Math.abs(signal.changePct)}% ${signal.changePct < 0 ? 'lower' : 'higher'}`;
}

export default function DimensionCard({ dimension }) {
  const sources = (dimension.forcedSources ?? [...new Set(dimension.signals.map((sig) => sig.source))]).filter((kind) => kind !== 'simulated');
  const hasData = dimension.status !== 'unknown';

  return (
    <section className={s.card} aria-labelledby={`dim-${dimension.id}`}>
      <header className={s.cardHead}>
        <h2 id={`dim-${dimension.id}`} className={s.cardTitle}>{dimension.title}</h2>
        {hasData && <StatusLabel status={dimension.status} />}
      </header>

      <p className={s.cardWords}>{dimension.words}</p>
      <p className={s.muted}>{sentence(dimension)}</p>

      {dimension.series.points.length >= 2 && (
        <>
          <p className={s.seriesLabel}>{dimension.series.label}</p>
          <TrendChart lines={[{ id: dimension.id, label: dimension.series.label, points: dimension.series.points }]} baseline={dimension.series.baseline} compact />
        </>
      )}

      {hasData && (
        <details className={s.details}>
          <summary>Show the numbers</summary>
          <ul className={s.signals}>
            {dimension.signals.map((sig) => (
              <li key={sig.id} className={s.signal}>
                <span className={s.signalName}>{sig.label}</span>
                <span className={s.signalValue}>
                  <span className={s.num}>{sig.displayValue ?? formatValue(sig)}</span>
                  <span className={s.muted}> · usual <span className={s.num}>{sig.displayBaseline ?? formatBaseline(sig)}</span></span>
                  {changeWords(sig) && <span className={s.muted}> · {changeWords(sig)}</span>}
                </span>
                <StatusLabel status={sig.status} />
              </li>
            ))}
          </ul>
        </details>
      )}

      {sources.length > 0 && (
        <p className={s.meta}>
          {sources.map((kind) => <SourceTag key={kind} kind={kind} />)}
        </p>
      )}
      <p className={s.muted}>
        {hasData ? `Confidence: ${dimension.confidence} (${dimension.present} of ${dimension.expected} signals) · ` : ''}
        {dimension.asOf}
      </p>
      <p className={s.muted}>{dimension.note}</p>

      <Button variant="secondary" to={dimension.href}>{dimension.linkLabel}</Button>
    </section>
  );
}
