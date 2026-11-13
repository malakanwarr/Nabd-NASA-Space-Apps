// Cycle and reproductive health, /body/cycle (owner: Layal). PRIVATE: only the crew member sees this.
// One call: GET /api/womens/cycle -> { data: womens-health.json, logs }.
// The cycle day, period length and next period are worked out from her period logs (helpers.js computeCycle);
// with no period logs the sample data is shown. Period days and "My period ended" can be undone.
// Her mode (cycle tracking or period suppression) is set in Profile and settings (/profile) and read here
// from localStorage `nabd-cycle-mode-<crewId>`; this page never writes it. The pill check-off is phone-only.
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import Button from '../../shared/Button.jsx';
import ListRow from '../../shared/ListRow.jsx';
import { apiFetch } from '../../shared/api.js';
import { useSession } from '../../shared/session.js';
import CycleRing from './CycleRing.jsx';
import { capitalize, computeCycle, isPeriodEnded, readLocal, shortDate, todayIso, writeLocal } from './helpers.js';
import s from './styles.module.css';

const OK_WORDS = ['regular', 'none', 'ok'];
const RECENT_LOGS = 5;

const MODE_LABEL = { cycle: 'Cycle tracking', suppression: 'Period suppression' };

function Header({ mode }) {
  return (
    <div className={s.top}>
      <ScreenHeader backTo="/body" backLabel="Body systems" title="Cycle and reproductive health" />
      <p className={s.private}>
        <svg className={s.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        Private · only you can see this
      </p>
      {mode && (
        <p className={s.modeLine}>
          {MODE_LABEL[mode]} ·{' '}
          <Link to="/profile" className={s.modeLink}>
            Change in settings
          </Link>
        </p>
      )}
    </div>
  );
}

// "Regular", "None", "OK" show in the stable color; anything else is shown as plain bold text.
function WatchList({ title, items }) {
  return (
    <section aria-label={title} className={s.section}>
      <h2 className={s.h2}>{title}</h2>
      {items.map((item) => (
        <ListRow
          key={item.name}
          title={item.name}
          right={<span className={OK_WORDS.includes(String(item.state).toLowerCase()) ? s.good : s.note}>{item.state}</span>}
        />
      ))}
    </section>
  );
}

// "+0.3 °C ok" -> "+0.3 °C is normal", "phase-aware" -> "Phase-aware" (wording from the design board).
function adjustmentText(value) {
  return capitalize(String(value).replace(/\s+ok$/i, ' is normal'));
}

function logTitle(log) {
  if (isPeriodEnded(log)) return 'Period ended';
  if (log.area === 'period') return 'Period day';
  return (log.symptoms || []).map((x, i) => (i === 0 ? x : x.toLowerCase())).join(', ');
}

function logSubtitle(log) {
  return [
    shortDate(log.date),
    log.area !== 'period' && log.area,
    log.strength && `strength ${log.strength} of 10`,
    log.notes,
  ]
    .filter(Boolean)
    .join(' · ');
}

function DoctorLink() {
  return (
    <ListRow
      to="/doctor"
      title="Something feels wrong?"
      subtitle="Cramps, heavy bleeding, swelling: ask the AI doctor"
      right={
        <svg className={s.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      }
    />
  );
}

export default function CyclePage() {
  const session = useSession();
  const crewId = session?.id;
  const location = useLocation();
  const navigate = useNavigate();

  const [load, setLoad] = useState({ status: 'loading', data: null, logs: [], error: '' });
  // Set in /profile (Habiba's screen). Read once when the page opens.
  const [savedMode] = useState(() => readLocal(`nabd-cycle-mode-${crewId}`, null));
  const [pillDate, setPillDate] = useState(() => readLocal(`nabd-pill-${crewId}`, null));
  // { text, undoId?, info? }: undoId adds an "Undo" button that deletes that log.
  const [message, setMessage] = useState(location.state?.saved ? { text: 'Saved. Your symptom is in your logs below.' } : null);
  const [period, setPeriod] = useState({ saving: false, error: '' });
  const [confirmNewCycle, setConfirmNewCycle] = useState(false);

  const fetchCycle = useCallback(() => {
    setLoad((prev) => ({ ...prev, status: 'loading', error: '' }));
    apiFetch(`/api/womens/cycle?crewId=${encodeURIComponent(crewId)}`)
      .then((res) => {
        if (!res || !res.data) throw new Error('Your cycle data is missing.');
        setLoad({ status: 'ready', data: res.data, logs: res.logs || [], error: '' });
      })
      .catch((err) => setLoad({ status: 'error', data: null, logs: [], error: err.message }));
  }, [crewId]);

  useEffect(() => {
    fetchCycle();
  }, [fetchCycle]);

  // Coming back from "Log a symptom": show "Saved" once, then forget it so a reload does not show it again.
  useEffect(() => {
    if (location.state?.saved) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  // Messages fade after a while; one with Undo stays longer so there is time to tap it.
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => setMessage(null), message.undoId ? 15000 : 6000);
    return () => clearTimeout(t);
  }, [message]);

  function setPill(value) {
    setPillDate(value);
    writeLocal(`nabd-pill-${crewId}`, value);
  }

  // symptom: 'period day' or 'period ended'. Same POST /api/womens/log as every log.
  async function savePeriodLog(symptom, text) {
    setPeriod({ saving: true, error: '' });
    setMessage(null);
    setConfirmNewCycle(false);
    try {
      const saved = await apiFetch('/api/womens/log', {
        method: 'POST',
        body: { crewId, date: todayIso(), area: 'period', symptoms: [symptom] },
      });
      setLoad((prev) => ({ ...prev, logs: [saved, ...prev.logs] }));
      setPeriod({ saving: false, error: '' });
      setMessage({ text, undoId: saved._id });
    } catch (err) {
      setPeriod({ saving: false, error: `Could not save. ${err.message}` });
    }
  }

  // "Log period day": already logged -> say so; in her period -> save; otherwise ask first (new cycle).
  function onLogPeriodDay(cyc) {
    setPeriod((prev) => ({ ...prev, error: '' }));
    if (cyc.todayLogged) {
      setConfirmNewCycle(false);
      setMessage({ text: 'Today is already logged.', info: true });
    } else if (cyc.inPeriod) {
      savePeriodLog('period day', 'Saved. Period day logged for today.');
    } else {
      setMessage(null);
      setConfirmNewCycle(true);
    }
  }

  async function undo(id) {
    setPeriod({ saving: true, error: '' });
    try {
      await apiFetch(`/api/womens/log/${encodeURIComponent(id)}?crewId=${encodeURIComponent(crewId)}`, { method: 'DELETE' });
      setLoad((prev) => ({ ...prev, logs: prev.logs.filter((l) => l._id !== id) }));
      setPeriod({ saving: false, error: '' });
      setMessage({ text: 'Removed.' });
    } catch (err) {
      setPeriod({ saving: false, error: `Could not undo. ${err.message}` });
    }
  }

  if (load.status === 'loading') {
    return (
      <main className={s.page}>
        <Header />
        <p className={s.sub} role="status">Loading your cycle…</p>
      </main>
    );
  }

  if (load.status === 'error') {
    return (
      <main className={s.page}>
        <Header />
        <div className={s.section} role="alert">
          <p className={s.error}>Could not load your cycle. {load.error}</p>
          <div>
            <Button onClick={fetchCycle}>Try again</Button>
          </div>
        </div>
      </main>
    );
  }

  const { data, logs } = load;
  const cycle = data.cycleTracking;
  const pills = data.periodSuppression;
  const activeMode = MODE_LABEL[savedMode] ? savedMode : data.activeMode === 'cycle' ? 'cycle' : 'suppression';
  const pillTaken = pillDate === todayIso();
  const enoughPills = pills.pillsLeft >= pills.pillsNeededToMars;
  const neededShare = Math.min(100, Math.round((pills.pillsNeededToMars / Math.max(1, pills.pillsLeft)) * 100));
  const cyc = computeCycle(cycle, logs, todayIso());

  return (
    <main className={s.page}>
      <Header mode={activeMode} />

      {activeMode === 'cycle' ? (
        <>
          <section aria-label="Today in your cycle" className={`${s.today} ${s.rise}`}>
            <CycleRing day={cyc.day} length={cyc.length} phases={cyc.phases} phaseName={cyc.phaseName} />
            <div className={s.todayText}>
              <span className={s.sub}>{capitalize(cyc.phaseName)} phase</span>
              <span className={s.big}>
                {cyc.inDays === null
                  ? 'Your period may start any day now'
                  : `Next period in about ${cyc.inDays} ${cyc.inDays === 1 ? 'day' : 'days'}`}
              </span>
              <span className={s.sub}>{cycle.hygieneSupplies.left} hygiene supplies left, enough to Mars</span>
            </div>
          </section>

          <div className={s.actions}>
            <Button onClick={() => onLogPeriodDay(cyc)} disabled={period.saving} aria-busy={period.saving}>
              Log period day
            </Button>
            {cyc.inPeriod ? (
              <Button
                variant="secondary"
                onClick={() => savePeriodLog('period ended', 'Saved. Your period is marked as ended.')}
                disabled={period.saving}
              >
                My period ended
              </Button>
            ) : (
              <Button variant="secondary" to="/body/cycle/log">
                Log a symptom
              </Button>
            )}
          </div>
          {cyc.inPeriod && (
            <div>
              <Button variant="text" to="/body/cycle/log">
                Log a symptom
              </Button>
            </div>
          )}

          {confirmNewCycle && (
            <div className={s.confirm} role="group" aria-label="Start a new cycle">
              <p className={s.confirmText} aria-live="polite">
                Start a new cycle today? Your cycle day goes back to 1.
              </p>
              <div className={s.confirmActions}>
                <Button
                  onClick={() => savePeriodLog('period day', 'Saved. Day 1 of a new cycle.')}
                  disabled={period.saving}
                  autoFocus
                >
                  Start new cycle
                </Button>
                <Button variant="text" onClick={() => setConfirmNewCycle(false)} disabled={period.saving}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {period.saving && (
            <p className={s.sub} role="status">
              Saving…
            </p>
          )}
        </>
      ) : (
        <>
          <section aria-label="Today's pill" className={`${s.section} ${s.rise}`}>
            <h2 className={s.h2}>Today's pill</h2>
            <p className={s.lead}>
              {pills.method} · {pills.doseTime}
            </p>
            {pillTaken ? (
              <div className={s.pillDone}>
                <span className={s.good}>
                  <svg className={s.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                  Taken today
                </span>
                <Button variant="text" onClick={() => setPill(null)}>
                  Undo
                </Button>
              </div>
            ) : (
              <div className={s.single}>
                <Button onClick={() => setPill(todayIso())}>Mark today's pill as taken</Button>
              </div>
            )}
          </section>

          <section aria-label="Pills left" className={s.section}>
            <span className={s.big}>{pills.pillsLeft} pills left</span>
            <p className={s.lead}>
              {enoughPills
                ? `Enough for the ${pills.pillsNeededToMars} days to Mars, with ${pills.spare} spare`
                : `Not enough for the ${pills.pillsNeededToMars} days to Mars`}
            </p>
            <div
              className={s.meter}
              role="img"
              aria-label={`${pills.pillsNeededToMars} of ${pills.pillsLeft} pills needed to reach Mars`}
            >
              <span className={s.meterFill} style={{ width: `${neededShare}%` }} />
            </div>
            <div className={s.meterLegend} aria-hidden="true">
              <span>Needed to Mars</span>
              <span>Spare</span>
            </div>
            <ListRow
              title="Last 30 days"
              right={<span className={s.value}>{pills.last30Days.taken} taken, {pills.last30Days.late} late</span>}
            />
            <ListRow
              title="Breakthrough spotting this month"
              right={
                <span className={s.value}>
                  {pills.breakthroughSpottingThisMonthDays} {pills.breakthroughSpottingThisMonthDays === 1 ? 'day' : 'days'}
                </span>
              }
            />
            <ListRow title="This batch expires" right={<span className={s.value}>Mission day {pills.batchExpiresMissionDay}</span>} />
          </section>

          <div className={s.single}>
            <Button variant="secondary" to="/body/cycle/log">
              Log a symptom
            </Button>
          </div>
        </>
      )}

      {(message || period.error) && (
        <p role="status" className={`${s.messageLine} ${period.error ? s.error : message.info ? s.info : s.saved}`}>
          <span>{period.error || message.text}</span>
          {!period.error && message.undoId && (
            <button type="button" className={s.undo} onClick={() => undo(message.undoId)} disabled={period.saving}>
              Undo
            </button>
          )}
        </p>
      )}

      {activeMode === 'cycle' ? (
        <>
          <section aria-label="Adjusted for your cycle" className={s.section}>
            <h2 className={s.h2}>Adjusted for your cycle</h2>
            <p className={s.lead}>So normal changes are not flagged as problems.</p>
            {cycle.phaseAdjustments.map((item) => (
              <ListRow key={item.name} title={item.name} right={<span className={s.value}>{adjustmentText(item.value)}</span>} />
            ))}
          </section>
          <WatchList title="What we watch for you" items={cycle.watch} />
        </>
      ) : (
        <WatchList title="What we watch for you" items={pills.watch} />
      )}

      <section aria-label="Your recent logs" className={s.section}>
        <h2 className={s.h2}>Your recent logs</h2>
        {logs.length === 0 ? (
          <p className={s.lead}>Nothing logged yet. Period days and symptoms you log show here.</p>
        ) : (
          logs.slice(0, RECENT_LOGS).map((log) => <ListRow key={log._id} title={logTitle(log)} subtitle={logSubtitle(log)} />)
        )}
      </section>

      <DoctorLink />
    </main>
  );
}
