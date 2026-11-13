import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSession, signIn } from '../../shared/session.js';
import Button from '../../shared/Button.jsx';
import Planet from '../../shared/Planet.jsx';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import styles from './styles.module.css';

export default function AdminSignInPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    signIn({ role: 'admin', id: 'admin', name: 'Mission Control admin' });
    const session = getSession();
    if (!session || session.role !== 'admin') {
      setError('Sign-in could not be saved on this device. Check browser storage and try again.');
      setSubmitting(false);
      return;
    }
    navigate('/admin', { replace: true });
  }

  return (
    <main className={`${styles.signInLayout} ${styles.rectangularControls}`}>
      <section className={styles.signInIntro}>
        <div className={styles.earthWrap} aria-hidden="true">
          <Planet kind="earth" size={460} />
        </div>
        <p className={styles.brandName}>NABD</p>
        <ScreenHeader eyebrow="Mission Control" title="Every crew member, at a glance" />
        <p className={styles.signInDescription}>
          See who needs attention, who missed a check-in, and add crew to a mission. Private health details stay with the crew and their flight surgeon.
        </p>
      </section>
      <section className={styles.signInCard} aria-labelledby="sign-in-title">
        <h2 id="sign-in-title" className={styles.cardTitle}>Sign in</h2>
        <p className={styles.muted}>For mission staff only</p>
        <form className={styles.signInForm} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>Work email</span>
            <input name="email" type="email" autoComplete="username" placeholder="Work email" required />
          </label>
          <label className={styles.field}>
            <span>Password</span>
            <span className={styles.passwordField}>
              <input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required />
            <button type="button" className={styles.passwordToggle} aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
            </span>
          </label>
          {error && <p className={styles.formError} role="alert">{error}</p>}
          <Button type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</Button>
        </form>
        <p className={styles.prototypeNote}>Prototype: sign-in is simulated. The real version would use the agency’s staff sign-in.</p>
        <Link className={styles.crewLink} to="/signin">I’m a crew member</Link>
      </section>
    </main>
  );
}
