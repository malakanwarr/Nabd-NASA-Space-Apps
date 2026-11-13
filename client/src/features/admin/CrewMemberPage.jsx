import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../shared/api.js';
import Button from '../../shared/Button.jsx';
import ListRow from '../../shared/ListRow.jsx';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import StatusLabel from '../../shared/StatusLabel.jsx';
import AdminShell from './AdminShell.jsx';
import styles from './styles.module.css';

function formatReadiness(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? value : '—';
}

export default function CrewMemberPage() {
  const { id } = useParams();
  const [request, setRequest] = useState({ key: null, status: 'loading', member: null, error: '' });
  const [reload, setReload] = useState(0);
  const requestKey = `${id}:${reload}`;

  useEffect(() => {
    let active = true;
    apiFetch('/api/crew')
      .then((response) => {
        if (!Array.isArray(response?.crew)) {
          throw new Error('The crew list could not be read. Please try again.');
        }
        const member = response.crew.find((crewMember) => String(crewMember.id) === id);
        if (!member) throw new Error('Crew member not found.');
        if (active) setRequest({ key: requestKey, status: 'success', member, error: '' });
      })
      .catch((requestError) => {
        if (active) setRequest({ key: requestKey, status: 'error', member: null, error: requestError.message });
      });
    return () => { active = false; };
  }, [id, requestKey]);

  const isCurrentRequest = request.key === requestKey;
  const status = isCurrentRequest ? request.status : 'loading';
  const member = isCurrentRequest ? request.member : null;
  const error = isCurrentRequest ? request.error : '';
  const alerts = Array.isArray(member?.alerts) ? member.alerts : [];

  return (
    <AdminShell>
      <main className={styles.page}>
        <ScreenHeader
          backTo="/admin"
          backLabel="Crew"
          eyebrow="Mission Control"
          title={status === 'success' ? member.name || 'Crew member' : 'Crew member'}
        />
        {status === 'loading' && <p className={styles.stateMessage} role="status">Loading crew member…</p>}
        {status === 'error' && (
          <div className={styles.errorState} role="alert">
            <p>{error}</p>
            <Button variant="secondary" onClick={() => setReload((value) => value + 1)}>Try again</Button>
          </div>
        )}
        {status === 'success' && (
          <>
            <section className={styles.memberSummary} aria-label="Crew member status">
              <div>
                <p className={styles.memberRole}>{member.role || 'Crew member'}</p>
                <StatusLabel status={String(member.status || 'unknown').toLowerCase()} />
              </div>
              <div className={styles.readinessSummary}>
                <span>Readiness</span>
                <strong>{formatReadiness(member.readiness)}</strong>
              </div>
            </section>

            <section className={styles.detailSection}>
              <h2 className={styles.sectionTitle}>Last check-in</h2>
              <ListRow title={member.lastCheckIn || 'No check-in recorded'} />
            </section>

            <section className={styles.detailSection} id="alerts">
              <h2 className={styles.sectionTitle}>Alerts</h2>
              {alerts.length > 0
                ? alerts.map((alert, index) => (
                  <ListRow key={`${alert}-${index}`} title={alert} />
                ))
                : <p className={styles.muted}>No active alerts.</p>}
            </section>

            <p className={styles.privacyNote}>
              Mission Control sees status, check-ins, readiness and alerts only. Medical details remain private to the flight surgeon.
            </p>
          </>
        )}
      </main>
    </AdminShell>
  );
}
