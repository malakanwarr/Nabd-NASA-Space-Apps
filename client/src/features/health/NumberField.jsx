// A labelled number box (owner: Habiba), used by the blood pressure and exercise forms.
import s from './styles.module.css';

export default function NumberField({ label, value, onChange, unit }) {
  return (
    <label className={s.field}>
      <span className={s.legend}>{label}{unit ? ` (${unit})` : ''}</span>
      <input className={s.input} type="number" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
