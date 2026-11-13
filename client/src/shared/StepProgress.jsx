// "Step 1 of 2 · Face and voice" with a small bar (Malak only).
import s from './shared.module.css';

export default function StepProgress({ step, total, label }) {
  return (
    <div>
      <div className={s.steps}>Step {step} of {total}{label ? ` · ${label}` : ''}</div>
      <div className={s.bar} aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`${s.seg} ${i < step ? s.segOn : ''}`} />
        ))}
      </div>
    </div>
  );
}
