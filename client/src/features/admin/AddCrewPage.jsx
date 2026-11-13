import { useState } from 'react';
import { apiFetch } from '../../shared/api.js';
import Button from '../../shared/Button.jsx';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import AdminShell from './AdminShell.jsx';
import styles from './styles.module.css';

export default function AddCrewPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const member = {
      name: String(formData.get('name') || '').trim(),
      birthDate: String(formData.get('birthDate') || ''),
      mission: String(formData.get('mission') || '').trim(),
      role: String(formData.get('role') || '').trim(),
      surgeon: String(formData.get('surgeon') || '').trim(),
      allergies: String(formData.get('allergies') || '').split(',').map((allergy) => allergy.trim()).filter(Boolean),
    };

    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const response = await apiFetch('/api/crew', { method: 'POST', body: member });
      setResult({ name: response?.name || member.name, pin: response?.firstPin || response?.pin || '' });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminShell>
      <main className={styles.page}>
        <ScreenHeader backTo="/admin" backLabel="Crew" eyebrow="Mission Control" title="Add crew member" />
        <p className={styles.formIntro}>Add a crew member to a mission. NABD learns their personal baseline during the first 14 days.</p>
        <form className={styles.crewForm} onSubmit={handleSubmit}>
          <fieldset className={styles.formSection} disabled={submitting || Boolean(result)}>
            <legend>Person</legend>
            <label className={styles.field}><span>Full name</span><input name="name" autoComplete="name" required /></label>
            <label className={styles.field}><span>Date of birth</span><input name="birthDate" type="date" required /></label>
          </fieldset>

          <fieldset className={styles.formSection} disabled={submitting || Boolean(result)}>
            <legend>Mission and role</legend>
            <label className={styles.field}><span>Mission</span><input name="mission" placeholder="Mission name" required /></label>
            <label className={styles.field}><span>Role</span><input name="role" placeholder="Mission role" required /></label>
            <label className={styles.field}><span>Flight surgeon</span><input name="surgeon" placeholder="Flight surgeon name" required /></label>
          </fieldset>

          <fieldset className={styles.formSection} disabled={submitting || Boolean(result)}>
            <legend>Health setup</legend>
            <label className={styles.field}><span>Allergies</span><input name="allergies" placeholder="None known, or separate allergies with commas" /></label>
            <p className={styles.muted}>Health details are for setup and the flight surgeon; they are not shown in Mission Control crew summaries.</p>
          </fieldset>

          {error && <p className={styles.formError} role="alert">{error}</p>}
          {result ? (
            <section className={styles.successState} role="status" aria-live="polite">
              <h2>Crew member added</h2>
              <p>{result.name} has been added to the mission.</p>
              {result.pin ? (
                <div className={styles.pinPanel}>
                  <span>First PIN, shown once</span>
                  <strong>{result.pin}</strong>
                  <p>Share this PIN directly with the crew member. They will change it at first sign-in.</p>
                </div>
              ) : (
                <p className={styles.formError}>The server did not return a first PIN. Confirm the crew record before asking them to sign in.</p>
              )}
              <div className={styles.formActions}><Button to="/admin">Back to crew</Button></div>
            </section>
          ) : (
            <div className={styles.formActions}>
              <Button variant="secondary" to="/admin">Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Adding crew member…' : 'Add crew member'}</Button>
            </div>
          )}
        </form>
      </main>
    </AdminShell>
  );
}
