import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useSession, signOut } from '../../shared/session.js';
import Button from '../../shared/Button.jsx';
import styles from './styles.module.css';

export default function AdminShell({ children }) {
  const session = useSession();
  const navigate = useNavigate();

  function handleSignOut() {
    signOut();
    navigate('/admin/signin', { replace: true });
  }

  return (
    <div className={`${styles.appShell} ${styles.rectangularControls}`}>
      <aside className={styles.sidebar}>
        <Link to="/admin" className={styles.brand}>
          <span className={styles.brandName}>NABD</span>
          <span className={styles.brandLabel}>Mission Control</span>
        </Link>
        <nav className={styles.navigation} aria-label="Mission Control">
          <NavLink to="/admin" end className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
            Crew
          </NavLink>
          <Link to="/admin#alerts" className={styles.navLink}>Alerts</Link>
        </nav>
        <div className={styles.account}>
          <p className={styles.accountName}>{session?.name || 'Mission Control admin'}</p>
          <Button variant="text" onClick={handleSignOut}>Sign out</Button>
        </div>
      </aside>
      <div className={styles.appContent}>{children}</div>
    </div>
  );
}
