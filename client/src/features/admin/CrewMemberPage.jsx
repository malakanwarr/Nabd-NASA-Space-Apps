import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../shared/api.js';
import Button from '../../shared/Button.jsx';
import ListRow from '../../shared/ListRow.jsx';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import StatusLabel from '../../shared/StatusLabel.jsx';
import AdminShell from './AdminShell.jsx';
import styles from './styles.module.css';

const SYSTEMS = [
  ['bonesAndMuscles', 'Bones and muscles'],
  ['mindAndSleep', 'Mind and sleep'],
  ['kidneys', 'Kidneys'],
  ['heart', 'Heart'],
  ['eyes', 'Eyes'],
  ['immuneAndSkin', 'Immune and skin'],
  ['radiation', 'Radiation'],
  ['cycle', 'Cycle and reproductive'],
];

function normalizeSystems(systems) {
  if (Array.isArray(systems)) {
    return Object.fromEntries(systems.map((system) => [system.id || system.name, system.status]));
  }
  return systems && typeof systems === 'object' ? systems : {};
}

function alertText(alert) {
  return typeof alert === 'string' ? alert : alert?.message || 'Alert details unavailable';
}

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
    apiFetch(`/api/crew/${encodeURIComponent(id)}`)
      .then((response) => {
        const member = response?.crew || response;
        if (!member || typeof member !== 'object' || Array.isArray(member)) {
          throw new Error('Crew member details could not be read. Please try again.');
        }
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
  const systems = normalizeSystems(member?.systems);
  const readinessHistory = Array.isArray(member?.readinessHistory) ? member.readinessHistory : [];
  const checkIns = Array.isArray(member?.checkIns) ? member.checkIns : Array.isArray(member?.checkins) ? member.checkins : [];
  const alerts = Array.isArray(member?.alerts) ? member.alerts : member?.alerts ? [member.alerts] : [];

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
              <h2 className={styles.sectionTitle}>Body systems</h2>
              <ul className={styles.systemList}>
              {SYSTEMS.map(([key, label]) => {
                if (key === 'cycle') return <li key={key}><ListRow title={label} right={<span className={styles.privateValue}>Private</span>} /></li>;
                const value = systems[key] ?? systems[label] ?? 'No update';
                const right = ['stable', 'watch', 'act'].includes(String(value).toLowerCase())
                  ? <StatusLabel status={String(value).toLowerCase()} />
                  : <span className={styles.muted}>{value}</span>;
                return <li key={key}><ListRow title={label} right={right} /></li>;
              })}
              </ul>
            </section>

            <section className={styles.detailSection}>
              <h2 className={styles.sectionTitle}>Readiness, last 7 days</h2>
              {readinessHistory.length > 0 ? (
                <ol className={styles.readinessHistory}>
                  {readinessHistory.slice(-7).map((entry, index) => {
                    const value = Math.max(0, Math.min(100, Number(entry.value ?? entry.readiness) || 0));
                    return (
                      <li key={entry.date || index} className={styles.historyItem}>
                        <span className={styles.historyDate}>{entry.label || entry.date || `Day ${index + 1}`}</span>
                        <span className={styles.historyTrack}>
                          <span className={styles.historyBar} style={{ '--readiness': `${value}%` }} />
                        </span>
                        <span className={styles.historyValue}>{value}</span>
                      </li>
                    );
                  })}
                </ol>
              ) : <p className={styles.muted}>No readiness history available.</p>}
            </section>

            <section className={styles.detailSection}>
              <h2 className={styles.sectionTitle}>Check-ins this week</h2>
              <p className={styles.checkinSummary}>
                {member.checkInSummary || member.checkinSummary || `${checkIns.length} ${checkIns.length === 1 ? 'check-in' : 'check-ins'} recorded`}
              </p>
              {checkIns.map((checkIn, index) => (
                <ListRow
                  key={checkIn.id || checkIn.date || index}
                  title={checkIn.date || checkIn.day || `Check-in ${index + 1}`}
                  right={<span className={styles.muted}>{checkIn.status || checkIn.label || 'Complete'}</span>}
                />
              ))}
            </section>

            <section className={styles.detailSection} id="alerts">
              <h2 className={styles.sectionTitle}>Alerts</h2>
              {alerts.length > 0 ? alerts.map((alert, index) => (
                <ListRow
                  key={alert.id || index}
                  title={alertText(alert)}
                  right={<span className={styles.muted}>{alert?.day || alert?.date || ''}</span>}
                />
              )) : <p className={styles.muted}>No active alerts.</p>}
            </section>

            <p className={styles.privacyNote}>
              Hidden from Mission Control: cycle data, face and voice details, and AI doctor conversations. The flight surgeon can see medical details.
            </p>
          </>
        )}
      </main>
    </AdminShell>
  );
}
