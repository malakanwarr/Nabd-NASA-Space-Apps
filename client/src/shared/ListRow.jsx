// A list row with a divider (Malak only): icon, title, subtitle, right side content. Link if `to` is given.
import { Link } from 'react-router-dom';
import s from './shared.module.css';

export default function ListRow({ icon, title, subtitle, right, to }) {
  const content = (
    <>
      {icon}
      <div className={s.rowText}>
        <p className={s.rowTitle}>{title}</p>
        {subtitle && <p className={s.rowSub}>{subtitle}</p>}
      </div>
      {right}
    </>
  );
  return to ? <Link to={to} className={s.row}>{content}</Link> : <div className={s.row}>{content}</div>;
}
