import s from './styles.module.css';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export default function PinPad({ onDigit, onDelete, disabled = false }) {
  return (
    <div className={s.pad} role="group" aria-label="PIN number pad">
      {DIGITS.map((d) => (
        <button
          key={d}
          type="button"
          className={s.key}
          disabled={disabled}
          onClick={() => onDigit(d)}
        >
          {d}
        </button>
      ))}
      <span aria-hidden="true" />
      <button type="button" className={s.key} disabled={disabled} onClick={() => onDigit('0')}>
        0
      </button>
      <button
        type="button"
        className={`${s.key} ${s.keyDelete}`}
        disabled={disabled}
        onClick={onDelete}
        aria-label="Delete last digit"
      >
        <svg viewBox="0 0 24 24" className={s.icon} aria-hidden="true" focusable="false">
          <path
            d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7 6-7z M12 9.5l5 5 M17 9.5l-5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
