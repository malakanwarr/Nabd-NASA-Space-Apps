import s from './styles.module.css';

export function HeartIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 5 6.1 5c2 0 3.5 1 4.4 2.4h3C14.4 6 15.9 5 17.9 5c3.4 0 5.2 3.4 3.7 6.8C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

// Three soft rings that grow out of the heart each time playKey changes (0 = not played yet).
// JavaScript decides about reduced motion here; theme.css only covers CSS animations.
export default function HeartRipple({ playKey = 0 }) {
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!playKey || reduce) return null;
  return (
    <span key={playKey} className={s.ripple} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}
