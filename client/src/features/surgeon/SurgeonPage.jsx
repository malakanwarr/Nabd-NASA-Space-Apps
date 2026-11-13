import { useEffect, useState } from 'react';
import { apiFetch } from '../../shared/api.js';
import Button from '../../shared/Button.jsx';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import StatusLabel from '../../shared/StatusLabel.jsx';
import { getSampleData } from '../../shared/sampleData.js';
import AdminShell from '../admin/AdminShell.jsx';
import styles from './styles.module.css';

const EMPTY_CREW = [];

function getCrewList(response) {
  const crew = Array.isArray(response) ? response : response?.crew;
  if (!Array.isArray(crew)) throw new Error('The crew list could not be read. Please try again.');
  return crew;
}

function getCrewId(member) {
  return String(member?.id || member?._id || '');
}

function getSurgeonData(response) {
  const data = response?.crew || response?.member || response;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('The medical details could not be read. Please try again.');
  }
  return data;
}

function formatTime(value) {
  if (!value) return 'Time unavailable';
  const match = String(value).match(/T(\d{2}:\d{2})/);
  return match ? match[1] : String(value);
}

function getNotes(data) {
  if (Array.isArray(data.notes)) return data.notes;
  if (Array.isArray(data.aiDoctorNotes)) return data.aiDoctorNotes;
  return [];
}

function getCycleSummary(data, crewId) {
  const shared = data.sharedWithConsent;
  if (shared?.astronautId === crewId && shared.cycleSummary) return shared.cycleSummary;
  if (data.cycleSharedWithConsent === true && data.sharedCycleSummary) return data.sharedCycleSummary;
  if (typeof data.sharedCycleSummary === 'object'
    && data.sharedCycleSummary?.sharedWithConsent === true
    && data.sharedCycleSummary.summary) {
    return data.sharedCycleSummary.summary;
  }
  return '';
}

function getBloodPressure(vitals) {
  const pressure = vitals.bloodPressure;
  if (pressure && typeof pressure === 'object') {
    const systolic = pressure.systolic ?? pressure.sys;
    const diastolic = pressure.diastolic ?? pressure.dia;
    return systolic != null && diastolic != null ? `${systolic}/${diastolic}` : '—';
  }
  return pressure || vitals.bloodPressureReading || '—';
}

function getVitals(data) {
  const vitals = data.vitals || data;
  const temperature = vitals.temperatureC ?? vitals.temperature;
  const sleep = data.sleepLastNightHours ?? vitals.sleepLastNightHours ?? vitals.sleepHours;
  return [
    { label: 'Heart rate', value: vitals.heartRateBpm ?? vitals.heartRate, unit: 'bpm' },
    { label: 'Blood pressure', value: getBloodPressure(vitals), unit: '' },
    { label: 'Temperature', value: temperature, unit: '°C' },
    { label: 'Oxygen', value: vitals.spo2Pct ?? vitals.oxygenPct ?? vitals.oxygen, unit: '%' },
    { label: 'Sleep, last night', value: sleep, unit: 'h', watch: true },
  ].map((item) => ({
    ...item,
    value: item.value === null || item.value === undefined || item.value === '' ? '—' : item.value,
  }));
}

export default function SurgeonPage() {
  const [reload, setReload] = useState(0);
  const [crewRequest, setCrewRequest] = useState({ key: null, status: 'loading', crew: EMPTY_CREW, error: '' });
  const [notesRequest, setNotesRequest] = useState({
    key: null, status: 'loading', data: null, sampleCrew: EMPTY_CREW, mission: null, error: '',
  });
  const [selectedId, setSelectedId] = useState('');
  const [detailRequest, setDetailRequest] = useState({ key: null, status: 'idle', data: null, source: '', warning: '', error: '' });
  const [reply, setReply] = useState('');
  const [replyState, setReplyState] = useState({ status: 'idle', error: '' });
  const requestKey = String(reload);

  useEffect(() => {
    let active = true;
    apiFetch('/api/crew')
      .then((response) => {
        const crew = getCrewList(response);
        if (active) setCrewRequest({ key: requestKey, status: 'success', crew, error: '' });
      })
      .catch((error) => {
        if (active) setCrewRequest({ key: requestKey, status: 'error', crew: EMPTY_CREW, error: error.message });
      });
    return () => { active = false; };
  }, [requestKey]);

  useEffect(() => {
    let active = true;
    Promise.all([
      getSampleData('surgeon-notes'),
      getSampleData('crew'),
      getSampleData('mission'),
    ])
      .then(([data, sampleCrewData, mission]) => {
        if (!Array.isArray(sampleCrewData?.crew)) throw new Error('Sample crew data could not be read.');
        if (active) {
          setNotesRequest({
            key: requestKey,
            status: 'success',
            data,
            sampleCrew: sampleCrewData.crew,
            mission,
            error: '',
          });
        }
      })
      .catch((error) => {
        if (active) {
          setNotesRequest({
            key: requestKey,
            status: 'error',
            data: null,
            sampleCrew: EMPTY_CREW,
            mission: null,
            error: error.message,
          });
        }
      });
    return () => { active = false; };
  }, [requestKey]);

  const apiCrew = crewRequest.key === requestKey ? crewRequest.crew : EMPTY_CREW;
  const crewStatus = crewRequest.key === requestKey ? crewRequest.status : 'loading';
  const notes = notesRequest.key === requestKey ? notesRequest.data : null;
  const sampleCrew = notesRequest.key === requestKey ? notesRequest.sampleCrew : EMPTY_CREW;
  const mission = notesRequest.key === requestKey ? notesRequest.mission : null;
  const crew = apiCrew.map((member) => {
    const sample = sampleCrew.find((item) => String(item.id) === getCrewId(member));
    if (!sample) return member;
    return {
      ...member,
      status: member.status && String(member.status).toLowerCase() !== 'unknown' ? member.status : sample.status,
      readiness: member.readiness ?? sample.readiness,
      sleep7Days: member.sleep7Days ?? (sample.sleepAvg7DaysHours == null ? undefined : `${sample.sleepAvg7DaysHours} h`),
      alerts: Array.isArray(member.alerts) && member.alerts.length > 0 ? member.alerts : sample.alerts,
    };
  });
  const reviewIds = Array.isArray(notes?.needsReview) ? notes.needsReview.map(String) : [];
  const preferredId = reviewIds.find((id) => crew.some((member) => getCrewId(member) === id));
  const activeCrewId = crewStatus === 'success' && crew.length > 0
    ? (crew.some((member) => getCrewId(member) === selectedId) ? selectedId : preferredId || getCrewId(crew[0]))
    : '';

  useEffect(() => {
    if (!activeCrewId || crewStatus !== 'success') return undefined;

    let active = true;
    const key = `${activeCrewId}:${requestKey}`;

    async function loadDetails() {
      let liveError = '';
      try {
        const response = await apiFetch(`/api/surgeon/${encodeURIComponent(activeCrewId)}`);
        const data = getSurgeonData(response);
        if (active) {
          setDetailRequest({ key, status: 'success', data, source: 'live', warning: '', error: '' });
          setReply(data.draftReply || '');
        }
        return;
      } catch (error) {
        liveError = error.message;
      }

      if (activeCrewId === 'sara') {
        try {
          const [today, sampleNotes, sampleCrewData] = await Promise.all([
            getSampleData('today'),
            getSampleData('surgeon-notes'),
            getSampleData('crew'),
          ]);
          const member = sampleCrewData.crew?.find((item) => String(item.id) === activeCrewId);
          const data = {
            vitals: today.vitals,
            sleepLastNightHours: today.sleepLastNightHours,
            allergies: member?.allergies || [],
            notes: Array.isArray(sampleNotes.notes)
              ? sampleNotes.notes.filter((note) => String(note.astronautId) === activeCrewId)
              : [],
            sharedWithConsent: sampleNotes.sharedWithConsent,
            draftReply: sampleNotes.draftReply || '',
          };
          if (active) {
            setDetailRequest({
              key,
              status: 'success',
              data,
              source: 'sample',
              warning: `Live medical details are unavailable (${liveError}). Showing Sara's sample data.`,
              error: '',
            });
            setReply(data.draftReply);
          }
          return;
        } catch (error) {
          liveError = `${liveError} Sample data: ${error.message}`;
        }
      }

      if (active) {
        setDetailRequest({ key, status: 'error', data: null, source: '', warning: '', error: liveError });
      }
    }

    loadDetails();
    return () => { active = false; };
  }, [activeCrewId, crewStatus, requestKey]);

  const selectedMember = crew.find((member) => getCrewId(member) === activeCrewId) || null;
  const detailKey = `${activeCrewId}:${requestKey}`;
  const detail = detailRequest.key === detailKey
    ? detailRequest
    : { status: activeCrewId ? 'loading' : 'idle' };
  const notesStatus = notesRequest.key === requestKey ? notesRequest.status : 'loading';
  const needsReview = crew.filter((member) => (
    reviewIds.includes(getCrewId(member))
    || ['watch', 'act'].includes(String(member.status || '').toLowerCase())
  ));
  const stableCrew = crew.filter((member) => String(member.status || '').toLowerCase() === 'stable');
  const otherCrew = crew.filter((member) => (
    !needsReview.includes(member) && !stableCrew.includes(member)
  ));
  const vitals = detail.data ? getVitals(detail.data) : [];
  const allergies = Array.isArray(detail.data?.allergies)
    ? detail.data.allergies.filter(Boolean).join(', ')
    : detail.data?.allergies || 'None recorded';
  const doctorNotes = detail.data ? getNotes(detail.data) : [];
  const cycleSummary = detail.data ? getCycleSummary(detail.data, activeCrewId) : '';
  const surgeonName = notes?.flightSurgeon || 'Flight surgeon';
  const missionName = mission?.name || 'Mission details unavailable';
  const missionDay = mission?.today?.missionDay;
  const delayMinutes = mission?.earthDelayOneWay?.minutes;
  const arrivalText = Number.isFinite(delayMinutes)
    ? `about ${delayMinutes} minutes`
    : 'the expected delay';

  async function sendReply(event) {
    event.preventDefault();
    const message = reply.trim();
    if (!message || !activeCrewId || replyState.status === 'sending') return;

    setReplyState({ status: 'sending', error: '' });
    try {
      await apiFetch(`/api/surgeon/${encodeURIComponent(activeCrewId)}/reply`, {
        method: 'POST',
        body: { message },
      });
      setReply('');
      setReplyState({ status: 'sent', error: '' });
    } catch (error) {
      setReplyState({ status: 'error', error: error.message });
    }
  }

  function renderCrewGroup(title, members, className = '') {
    if (members.length === 0) return null;
    return (
      <section className={styles.crewGroup} aria-label={title}>
        <h2 className={styles.groupTitle}>{title}</h2>
        <ul className={styles.crewList}>
          {members.map((member) => {
            const id = getCrewId(member);
            const selected = id === activeCrewId;
            return (
              <li key={id || member.name}>
                <button
                  type="button"
                  className={`${styles.crewItem} ${selected ? styles.crewItemSelected : ''}`}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => {
                    setSelectedId(id);
                    setReply('');
                    setReplyState({ status: 'idle', error: '' });
                  }}
                  disabled={!id}
                >
                  <span className={styles.crewItemTop}>
                    <span className={styles.crewName}>{member.name || 'Crew member'}</span>
                    <span className={`${styles.crewStatus} ${className}`}>
                      {reviewIds.includes(id) ? 'Watch' : String(member.status || 'Stable').replace(/^./, (c) => c.toUpperCase())}
                    </span>
                  </span>
                  <span className={styles.crewSummary}>
                    {member.sleep7Days && member.sleep7Days !== '—'
                      ? `Sleep ${member.sleep7Days}`
                      : member.lastCheckIn || member.lastCheckin || member.role || 'No recent update'}
                    {Array.isArray(member.alerts) && member.alerts.length > 0
                      ? ` · ${member.alerts.map((alert) => typeof alert === 'string' ? alert : alert?.text || alert?.message).filter(Boolean)[0] || 'Alert'}`
                      : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  return (
    <AdminShell>
      <main className={styles.dashboard}>
      <aside className={styles.sidebar} aria-label="Crew navigation">
        <div className={styles.brand}>
          <strong className={styles.crewTitle}>Crew</strong>
          <span className={styles.brandRole}>Flight surgeon</span>
          <span className={styles.brandNameSmall}>{surgeonName}</span>
        </div>
        {crewStatus === 'loading' && <p className={styles.sidebarState} role="status">Loading crew…</p>}
        {crewStatus === 'error' && (
          <div className={styles.sidebarError} role="alert">
            <p>{crewRequest.error}</p>
            <Button variant="secondary" onClick={() => setReload((value) => value + 1)}>Try again</Button>
          </div>
        )}
        {crewStatus === 'success' && crew.length === 0 && (
          <p className={styles.sidebarState}>No crew members are available yet.</p>
        )}
        {crewStatus === 'success' && crew.length > 0 && (
          <>
            {renderCrewGroup('Needs review', needsReview, styles.watch)}
            {renderCrewGroup('Stable', stableCrew, styles.stable)}
            {renderCrewGroup('Other crew', otherCrew)}
          </>
        )}
      </aside>

      <section className={styles.workspace} aria-live="polite">
        <div className={styles.missionBar}>
          <span>
            {missionName}
            {missionDay != null ? ` · Day ${missionDay}` : ''}
            {Number.isFinite(delayMinutes) ? ` · data arrives ${delayMinutes} min late` : ''}
          </span>
          {selectedMember && <StatusLabel status={String(selectedMember.status || 'unknown').toLowerCase()} />}
        </div>

        <ScreenHeader
          eyebrow={selectedMember?.role || 'Flight surgeon'}
          title={selectedMember?.name || (crewStatus === 'success' ? 'Select a crew member' : 'Flight surgeon')}
        />

        {notesStatus === 'error' && (
          <p className={styles.inlineError} role="status">
            Review groups and sample note labels could not be loaded: {notesRequest.error}
          </p>
        )}

        {detail.status === 'loading' && (
          <p className={styles.stateMessage} role="status">Loading medical details…</p>
        )}
        {detail.status === 'error' && (
          <div className={styles.errorState} role="alert">
            <p>{detail.error}</p>
            <Button variant="secondary" onClick={() => setReload((value) => value + 1)}>Try again</Button>
          </div>
        )}
        {detail.status === 'success' && detail.data && (
          <>
            {detail.warning && <p className={styles.sampleNotice} role="status">{detail.warning}</p>}

            <section className={styles.vitals} aria-label="Crew member health summary">
              {vitals.map((item) => (
                <div className={styles.vital} key={item.label}>
                  <span className={styles.vitalLabel}>{item.label}</span>
                  <strong className={`${styles.vitalValue} ${item.watch ? styles.watchValue : ''}`}>
                    {item.value}{item.unit ? ` ${item.unit}` : ''}
                  </strong>
                </div>
              ))}
            </section>

            <div className={styles.detailGrid}>
              <div className={styles.notesColumn}>
                <section className={styles.detailSection}>
                  <h2 className={styles.sectionTitle}>Notes from the AI doctor</h2>
                  {doctorNotes.length > 0 ? (
                    <ul className={styles.noteList}>
                      {doctorNotes.map((note, index) => (
                        <li className={styles.note} key={note.id || note.sentShipTime || index}>
                          <div className={styles.noteTimes}>
                            <span>Sent {formatTime(note.sentShipTime || note.sentAt)} ship time</span>
                            <span>Arrived {formatTime(note.arrivedEarthTime || note.arrivedAt)} Earth time</span>
                          </div>
                          {note.energyScore != null && (
                            <p className={styles.energyScore}>Energy score {note.energyScore}</p>
                          )}
                          <p className={styles.noteText}>{note.text || note.content || 'Note details unavailable.'}</p>
                        </li>
                      ))}
                    </ul>
                  ) : <p className={styles.muted}>No AI doctor notes are available.</p>}
                </section>

                {allergies && allergies !== 'None recorded' && (
                  <section className={styles.detailSection}>
                    <h2 className={styles.sectionTitle}>Allergies</h2>
                    <p className={styles.allergy}>{allergies}</p>
                  </section>
                )}

                <section className={styles.detailSection}>
                  <h2 className={styles.sectionTitle}>Cycle and reproductive health</h2>
                  {cycleSummary
                    ? <p className={styles.cycleSummary}>{cycleSummary} <span>Shared with consent</span></p>
                    : <p className={styles.muted}>No cycle details shared with the flight surgeon.</p>}
                </section>
              </div>

              <section className={styles.replySection} aria-labelledby="reply-title">
                <h2 className={styles.sectionTitle} id="reply-title">Reply to {selectedMember?.name || 'crew member'}</h2>
                <form className={styles.replyForm} onSubmit={sendReply}>
                  <label className={styles.replyLabel} htmlFor="surgeon-reply">Message</label>
                  <textarea
                    id="surgeon-reply"
                    className={styles.replyInput}
                    value={reply}
                    onChange={(event) => {
                      setReply(event.target.value);
                      if (replyState.status !== 'sending') setReplyState({ status: 'idle', error: '' });
                    }}
                    rows={5}
                    maxLength={1000}
                    placeholder="Write a reply for the crew member"
                  />
                  <p className={styles.delayLine}>Reaches the ship in {arrivalText}.</p>
                  <Button type="submit" disabled={!reply.trim() || replyState.status === 'sending'}>
                    {replyState.status === 'sending' ? 'Sending…' : 'Send to crew member'}
                  </Button>
                </form>
                {replyState.status === 'sent' && (
                  <p className={styles.successMessage} role="status">Reply sent. It will reach the ship in {arrivalText}.</p>
                )}
                {replyState.status === 'error' && (
                  <p className={styles.inlineError} role="alert">
                    The reply was not sent: {replyState.error}
                  </p>
                )}
              </section>
            </div>
          </>
        )}

        {crewStatus === 'success' && crew.length > 0 && !selectedMember && (
          <p className={styles.stateMessage}>Choose a crew member to review their details.</p>
        )}
      </section>
      </main>
    </AdminShell>
  );
}
