// Status as a dot plus a word (Malak only). status: stable | watch | act.
import s from './shared.module.css';

const WORDS = { stable: 'Stable', watch: 'Watch', act: 'Act' };

export default function StatusLabel({ status }) {
  return (
    <span className={`${s.status} ${s[status]}`}>
      <span className={s.dot} aria-hidden="true" />
      {WORDS[status] || status}
    </span>
  );
}
