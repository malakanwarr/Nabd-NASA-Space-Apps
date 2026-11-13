// Bottom tab bar for phone screens (Malak only): Home, Body, Check in, Doctor, Family.
import { Link, useLocation } from 'react-router-dom';
import s from './shared.module.css';

const svg = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

const ITEMS = [
  { to: '/', label: 'Home', icon: <svg {...svg}><path d="M3 11l9-8 9 8M5 10v10h14V10" /></svg> },
  { to: '/body', label: 'Body', icon: <svg {...svg}><circle cx="12" cy="5" r="2" /><path d="M12 8v7M7 11h10M9 21l3-6 3 6" /></svg> },
  { to: '/checkin', label: 'Check in', center: true, icon: <svg {...svg}><path d="M2 12h5l3-7 4 14 3-7h5" /></svg> },
  { to: '/doctor', label: 'Doctor', icon: <svg {...svg}><path d="M4 5h16v11H9l-5 4z" /></svg> },
  { to: '/family', label: 'Family', icon: <svg {...svg}><path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z" /></svg> },
];

function isActive(pathname, to) {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(to + '/');
}

export default function TabBar() {
  const { pathname } = useLocation();
  return (
    <nav className={s.tabbar} aria-label="Main">
      <div className={s.tabs}>
        {ITEMS.map((item) => (
          <Link key={item.to} to={item.to} className={`${s.tab} ${isActive(pathname, item.to) ? s.tabActive : ''}`} aria-current={isActive(pathname, item.to) ? 'page' : undefined}>
            {item.center ? <span className={s.checkin}>{item.icon}</span> : item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
