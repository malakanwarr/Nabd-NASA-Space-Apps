// Sleep length against reaction time (owner: Habiba). One dot per day, plus a straight line that follows the dots.
import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, XAxis, YAxis, ZAxis } from 'recharts';
import useChartColors from '../mood-results/useChartColors.js';
import s from './styles.module.css';

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function fitLine(points) {
  const n = points.length;
  if (n < 3) return null;
  const mx = points.reduce((a, p) => a + p.x, 0) / n;
  const my = points.reduce((a, p) => a + p.y, 0) / n;
  const num = points.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0);
  const den = points.reduce((a, p) => a + (p.x - mx) ** 2, 0);
  if (den === 0) return null;
  const slope = num / den;
  const xs = points.map((p) => p.x);
  const x1 = Math.min(...xs);
  const x2 = Math.max(...xs);
  return [
    { x: x1, y: my + slope * (x1 - mx) },
    { x: x2, y: my + slope * (x2 - mx) },
  ];
}

// points: [{ x: hours, y: ms }] (sample days). today: one extra measured point or null.
export default function ScatterPlot({ points, today }) {
  const colors = useChartColors();
  const line = fitLine(points);
  const xs = points.concat(today ? [today] : []).map((p) => p.x);
  const spoken = `Hours slept against reaction time for ${points.length} days.`;
  return (
    <figure className={s.chartBox}>
      <div role="img" aria-label={spoken}>
        <ResponsiveContainer width="100%" height={220}>
          <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={colors.line} strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name="Sleep"
              unit=" h"
              domain={[Math.floor(Math.min(...xs) - 0.2), Math.ceil(Math.max(...xs) + 0.2)]}
              tick={{ fill: colors.muted, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Reaction"
              unit=" ms"
              width={52}
              domain={[(lo) => Math.floor(lo - 10), (hi) => Math.ceil(hi + 10)]}
              tick={{ fill: colors.muted, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <ZAxis range={[60, 60]} />
            {line && <ReferenceLine segment={line} stroke={colors.muted} strokeDasharray="4 4" />}
            <Scatter data={points} fill={colors.raised} stroke={colors.primary} strokeWidth={2} isAnimationActive={!reduceMotion()} />
            {today && <Scatter data={[today]} fill={colors.watch} stroke={colors.watch} isAnimationActive={false} />}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <figcaption className={s.caption}>
        Hours slept along the bottom, reaction time up the side{today && '. The yellow dot is today, measured in your check-in'}. The dashed line follows the dots.
      </figcaption>
    </figure>
  );
}
