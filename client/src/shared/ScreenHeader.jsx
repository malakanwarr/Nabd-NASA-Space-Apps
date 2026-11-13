// Top of every screen (Malak only): optional back link, small eyebrow text, big title.
import { Link } from 'react-router-dom';
import s from './shared.module.css';

export default function ScreenHeader({ backTo, backLabel = 'Back', eyebrow, title }) {
  return (
    <header className={s.header}>
      {backTo && <Link to={backTo} className={s.back}>‹ {backLabel}</Link>}
      {eyebrow && <p className={s.eyebrow}>{eyebrow}</p>}
      <h1 className={s.title}>{title}</h1>
    </header>
  );
}
