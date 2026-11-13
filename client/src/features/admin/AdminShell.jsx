import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSession, signOut } from '../../shared/session.js';
import Button from '../../shared/Button.jsx';
import styles from './styles.module.css';

export default function AdminShell({ children }) {
  const session = useSession();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  // The flight surgeon page shares this sidebar, so it is labelled for whoever is using it.
  const surgeon = pathname.startsWith('/surgeon');
  const roleLabel = surgeon ? 'Flight surgeon' : 'Mission Control';
  // Alerts = the crew overview filtered to Watch or Act. Medical details stay on the flight surgeon page.
  const alertsOpen = pathname === '/admin' && new URLSearchParams(search).get('filter') === 'attention';
  const crewOpen = pathname === '/admin' && !alertsOpen;

  function handleSignOut() {
    signOut();
    navigate('/admin/signin', { replace: true });
  }

  return (
    <div className={`${styles.appShell} ${styles.rectangularControls}`}>
      <aside className={styles.sidebar}>
        <Link to="/admin" className={styles.brand}>
          <span className={styles.brandName}>NABD</span>
          <span className={styles.brandLabel}>{roleLabel}</span>
        </Link>
        <nav className={styles.navigation} aria-label="Mission Control">
          <Link to="/admin" className={`${styles.navLink} ${crewOpen ? styles.navLinkActive : ''}`} aria-current={crewOpen ? 'page' : undefined}>
            Crew
          </Link>
          <Link to="/admin?filter=attention" className={`${styles.navLink} ${alertsOpen ? styles.navLinkActive : ''}`} aria-current={alertsOpen ? 'page' : undefined}>
            Alerts
          </Link>
        </nav>
        <div className={styles.account}>
          <p className={styles.accountName}>{surgeon ? 'Flight surgeon' : session?.name || 'Mission Control admin'}</p>
          <Button variant="text" onClick={handleSignOut}>Sign out</Button>
        </div>
      </aside>
      <div className={styles.appContent}>{children}</div>
    </div>
  );
}
