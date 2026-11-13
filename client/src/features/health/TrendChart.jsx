// A line chart over mission days (owner: Habiba).
// lines: [{ id, label, points: [{ x, y, source }] }], baseline: the astronaut's normal (dashed line).
import { Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import useChartColors from '../mood-results/useChartColors.js';
import s from './styles.module.css';

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function TrendChart({ lines, baseline, baselineNote = 'The dashed line is your normal.', yFormat = (v) => String(Math.round(v)), compact = false, height }) {
  const colors = useChartColors();
  const palette = [colors.primary, colors.watch];

  // One row per mission day, with each line's value and its source.
  const days = new Map();
  lines.forEach((line) =>
    line.points.forEach((p) => {
      const row = days.get(p.x) || { x: p.x };
      row[line.id] = p.y;
      row[`${line.id}Source`] = p.source;
      days.set(p.x, row);
    }),
  );
  const data = [...days.values()].sort((a, b) => a.x - b.x);

  const values = lines.flatMap((l) => l.points.map((p) => p.y)).concat(baseline ?? []);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo || 1) * 0.15;

  const spoken = lines
    .map((l) => `${l.label}: ${l.points.slice(-3).map((p) => `day ${p.x} ${yFormat(p.y)}`).join(', ')}`)
    .concat(baseline != null ? `your normal is ${yFormat(baseline)}` : [])
    .join('. ');

  return (
    <figure className={s.chartBox}>
      <div role="img" aria-label={spoken}>
        <ResponsiveContainer width="100%" height={height ?? (compact ? 64 : 180)}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: compact ? 8 : 0 }}>
            <XAxis dataKey="x" hide={compact} axisLine={false} tickLine={false} tick={{ fill: colors.muted, fontSize: 12 }} interval="preserveStartEnd" />
            <YAxis hide={compact} domain={[lo - pad, hi + pad]} width={44} axisLine={false} tickLine={false} tick={{ fill: colors.muted, fontSize: 12 }} tickFormatter={yFormat} />
            {baseline != null && <ReferenceLine y={baseline} stroke={colors.muted} strokeDasharray="4 4" />}
            {lines.map((line, i) => (
              <Line
                key={line.id}
                type="linear"
                dataKey={line.id}
                stroke={palette[i % palette.length]}
                strokeWidth={2.5}
                connectNulls
                isAnimationActive={!reduceMotion()}
                animationDuration={1200}
                activeDot={false}
                dot={({ cx, cy, payload, index }) => {
                  if (cx == null || cy == null || payload[line.id] == null) return <g key={`${line.id}-${index}`} />;
                  return (
                    <circle
                      key={`${line.id}-${index}`}
                      cx={cx}
                      cy={cy}
                      r={compact ? 3 : 4}
                      fill={palette[i % palette.length]}
                      stroke={palette[i % palette.length]}
                      strokeWidth={2}
                    />
                  );
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {!compact && (
        <figcaption className={s.caption}>
          {lines.length > 1 && <span>{lines.map((l, i) => `${i === 0 ? 'Blue' : 'Yellow'}: ${l.label}`).join(' · ')}. </span>}
          Mission day along the bottom.{baseline != null && ` ${baselineNote}`}
        </figcaption>
      )}
    </figure>
  );
}
