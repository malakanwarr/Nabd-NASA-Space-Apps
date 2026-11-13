import s from './homePage.module.css';

const R = 44;
const C = 2 * Math.PI * R;

export default function ReadinessRing({ value, label, tone = 'stable' }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={s.ring} role="img" aria-label={`Readiness ${value} out of 100. ${label}`}>
      <svg viewBox="0 0 100 100" className={s.ringSvg} aria-hidden="true">
        <circle cx="50" cy="50" r={R} className={s.ringTrack} />
        <circle
          cx="50"
          cy="50"
          r={R}
          className={`${s.ringValue} ${s[`tone_${tone}`]}`}
          strokeDasharray={`${(C * pct) / 100} ${C}`}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <span className={s.ringNumber}>{value}</span>
    </div>
  );
}
