// Button (Malak only). variant: primary | secondary | danger | text. Use `to` for a link or `onClick` for an action.
import { Link } from 'react-router-dom';
import s from './shared.module.css';

export default function Button({ variant = 'primary', to, onClick, children, ...rest }) {
  const cls = `${s.btn} ${s[variant]}`;
  if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>;
  return <button type="button" className={cls} onClick={onClick} {...rest}>{children}</button>;
}
