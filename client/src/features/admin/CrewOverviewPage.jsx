import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../shared/api.js';
import Button from '../../shared/Button.jsx';
import Chip from '../../shared/Chip.jsx';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import StatusLabel from '../../shared/StatusLabel.jsx';
import AdminShell from './AdminShell.jsx';
import styles from './styles.module.css';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'watch', label: 'Watch' },
  { id: 'act', label: 'Act' },
  { id: 'missed', label: 'Missed check-in' },
];
const EMPTY_CREW = [];

function isMissedCheckIn(member) {
  const lastCheckIn = String(member.lastCheckIn || member.lastCheckin || '').toLowerCase();
  return member.missedCheckIn === true || member.checkInStatus === 'missed' || lastCheckIn.includes('missed');
}

function hasCheckedInToday(member) {
  const checkInStatus = String(member.checkInStatus || '').toLowerCase();
  const lastCheckIn = String(member.lastCheckIn || member.lastCheckin || '').toLowerCase();
  return checkInStatus === 'checked-in' || checkInStatus === 'checked in' || lastCheckIn.startsWith('today');
}

function getAlerts(alerts) {
  if (Array.isArray(alerts)) {
    return alerts.map((alert) => typeof alert === 'string' ? alert : alert?.message).filter(Boolean).join('; ');
  }
  return typeof alerts === 'string' ? alerts : '—';
}

function getCrewList(response) {
  const crew = Array.isArray(response) ? response : response?.crew;
  if (!Array.isArray(crew)) throw new Error('The crew list could not be read. Please try again.');
  return crew;
}

function formatReadiness(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? value : '—';
}

export default function CrewOverviewPage() {
  const [request, setRequest] = useState({ key: null, status: 'loading', crew: [], error: '' });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [reload, setReload] = useState(0);
  const requestKey = String(reload);

  useEffect(() => {
    let active = true;
    apiFetch('/api/crew')
      .then((response) => {
        const members = getCrewList(response);
        if (active) setRequest({ key: requestKey, status: 'success', crew: members, error: '' });
      })
      .catch((requestError) => {
        if (active) setRequest({ key: requestKey, status: 'error', crew: [], error: requestError.message });
      });
    return () => { active = false; };
  }, [requestKey]);

  const isCurrentRequest = request.key === requestKey;
  const status = isCurrentRequest ? request.status : 'loading';
  const crew = isCurrentRequest ? request.crew : EMPTY_CREW;
  const error = isCurrentRequest ? request.error : '';
  const counts = useMemo(() => ({
    watch: crew.filter((member) => String(member.status).toLowerCase() === 'watch').length,
    act: crew.filter((member) => String(member.status).toLowerCase() === 'act').length,
    checkedIn: crew.filter(hasCheckedInToday).length,
  }), [crew]);
  const visibleCrew = useMemo(() => {
    const query = search.trim().toLowerCase();
    return crew.filter((member) => {
      const matchesFilter = filter === 'all'
        || (filter === 'missed' ? isMissedCheckIn(member) : String(member.status).toLowerCase() === filter);
      const matchesSearch = !query || `${member.name || ''} ${member.role || ''}`.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [crew, filter, search]);

  return (
    <AdminShell>
      <main className={styles.page}>
        <div className={styles.pageHeading}>
          <div>
            <ScreenHeader eyebrow="Mission Control" title="Crew overview" />
            <p className={styles.muted}>Crew status, check-ins, readiness and alerts for this mission.</p>
          </div>
          <Button to="/admin/crew/new">Add crew member</Button>
        </div>
        {status === 'loading' && <p className={styles.stateMessage} role="status">Loading crew…</p>}
        {status === 'error' && (
          <div className={styles.errorState} role="alert">
            <p>{error}</p>
            <Button variant="secondary" onClick={() => setReload((value) => value + 1)}>Try again</Button>
          </div>
        )}
        {status === 'success' && (
          <>
            <p className={styles.summary} aria-live="polite">
              {crew.length} {crew.length === 1 ? 'crew member' : 'crew members'}
              {' · '}{counts.watch} on Watch
              {' · '}{counts.act} need action
              {' · '}{counts.checkedIn} of {crew.length} checked in today
            </p>
            <div className={styles.tableTools}>
              <label className={styles.searchLabel}>
                <span>Search crew</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name or role"
                />
              </label>
              <div className={styles.filters} aria-label="Filter crew by status">
                {FILTERS.map((item) => (
                  <Chip key={item.id} selected={filter === item.id} onClick={() => setFilter(item.id)}>
                    {item.label}
                  </Chip>
                ))}
              </div>
            </div>
            {crew.length === 0 ? (
              <p className={styles.stateMessage}>No crew members have been added yet.</p>
            ) : visibleCrew.length === 0 ? (
              <p className={styles.stateMessage}>No crew members match this search or filter.</p>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.crewTable}>
                  <caption className={styles.visuallyHidden}>Crew health and mission readiness</caption>
                  <thead>
                    <tr>
                      <th scope="col">Crew member</th>
                      <th scope="col">Status</th>
                      <th scope="col">Readiness</th>
                      <th scope="col">Last check-in</th>
                      <th scope="col">Alert</th>
                      <th scope="col"><span className={styles.visuallyHidden}>Details</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCrew.map((member) => {
                      const memberId = member.id || member._id;
                      return (
                        <tr key={memberId || member.name}>
                          <td>
                            <span className={styles.memberName}>{member.name || 'Crew member'}</span>
                            <span className={styles.memberRole}>{member.role || 'Role not provided'}</span>
                          </td>
                          <td><StatusLabel status={String(member.status || 'unknown').toLowerCase()} /></td>
                          <td>{formatReadiness(member.readiness)}</td>
                          <td>{member.lastCheckIn || member.lastCheckin || '—'}</td>
                          <td className={styles.alertCell}>{getAlerts(member.alerts)}</td>
                          <td>
                            {memberId ? <Link className={styles.openLink} to={`/admin/crew/${encodeURIComponent(memberId)}`}>Open</Link> : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className={styles.privacyNote}>
              You see status, check-ins and alerts. Cycle data, face and voice details and AI doctor chats stay private to the crew and their flight surgeon.
            </p>
          </>
        )}
      </main>
    </AdminShell>
  );
}
