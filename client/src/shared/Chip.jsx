// A small filter / choice button (Malak only).
import s from './shared.module.css';

export default function Chip({ selected = false, onClick, children }) {
  return (
    <button type="button" className={`${s.chip} ${selected ? s.chipOn : ''}`} aria-pressed={selected} onClick={onClick}>
      {children}
    </button>
  );
}
