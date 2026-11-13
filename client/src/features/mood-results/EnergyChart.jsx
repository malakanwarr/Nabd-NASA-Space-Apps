// The 7-day energy chart on the results screen (owner: Malak).
// A line that draws itself in, with a band showing Sara's normal range. The whole chart is
// one picture with a spoken description, because a line on its own says nothing out loud.
import { Line, LineChart, ReferenceArea, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import useChartColors from './useChartColors.js';
import s from './styles.module.css';

function prefersLessMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function EnergyChart({ points, normalFrom, normalTo }) {
  const colors = useChartColors();
  const still = prefersLessMotion();

  const spoken = points
    .map((p) => `${p.name} ${p.energyScore}`)
    .concat(`your normal is ${normalFrom} to ${normalTo}`)
    .join(', ');

  // The newest day is drawn as its own one-point line, so it can carry the status colour.
  const newest = points[points.length - 1];
  const newestColor = (newest && colors[newest.status]) || colors.watch;

  return (
    <div className={s.chart} role="img" aria-label={`Energy over the last days: ${spoken}.`}>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={points} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
          <YAxis hide domain={[40, 100]} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: colors.muted, fontSize: 12 }}
            interval={0}
          />
          <ReferenceArea
            y1={normalFrom}
            y2={normalTo}
            fill={colors.raised}
            fillOpacity={1}
            ifOverflow="extendDomain"
          />
          <Line
            type="linear"
            dataKey="energyScore"
            stroke={colors.primary}
            strokeWidth={2.5}
            dot={{ fill: colors.primary, stroke: 'none', r: 4 }}
            activeDot={false}
            isAnimationActive={!still}
            animationDuration={1600}
            animationEasing="ease-out"
          />
          <Line
            type="linear"
            dataKey="newest"
            stroke="none"
            dot={{ fill: newestColor, stroke: 'none', r: 6 }}
            activeDot={false}
            isAnimationActive={!still}
            animationBegin={1600}
            animationDuration={500}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className={s.bandNote}>
        The band is your normal: {normalFrom} to {normalTo}.
      </p>
    </div>
  );
}
