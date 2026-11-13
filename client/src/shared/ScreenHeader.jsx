// Top of every screen (Malak only): optional back link, small eyebrow text, big title.
import { Link } from 'react-router-dom';
import s from './shared.module.css';

// `right` (optional) sits on the same row as the title, aligned right.
export default function ScreenHeader({ backTo, backLabel = 'Back', eyebrow, title, right }) {
  return (
    <header className={right ? `${s.header} ${s.headerTight}` : s.header}>
      {backTo && <Link to={backTo} className={s.back}>‹ {backLabel}</Link>}
      {eyebrow && <p className={s.eyebrow}>{eyebrow}</p>}
      {right ? (
        <div className={s.titleRow}>
          <h1 className={s.title}>{title}</h1>
          {right}
        </div>
      ) : (
        <h1 className={s.title}>{title}</h1>
      )}
    </header>
  );
}
