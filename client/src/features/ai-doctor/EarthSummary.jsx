// "Send to Earth" under ONE AI doctor answer (owner: Hana Haytham). Design: Doctor.dc.html.
// She chooses which answers go to the flight surgeon (her profile says data goes to Earth "by choice").
// Sends POST /api/surgeon/:crewId/notes; the server writes a short note, saves it and returns the times.
// Then the line fills in real time over the one-way delay, using the server's sentAt and arrivesAt.
// After a reload, answers she already sent come back with `sentToEarth`, so the line carries on where it really is.
import { useEffect, useState } from 'react';
import { apiFetch } from '../../shared/api.js';
import s from './styles.module.css';

function clock(value) {
  const d = new Date(value);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * @param {{ mission: object, crewId: string, exchange: { id?, question, text, redFlag?, redFlagReason?, sources?, sentToEarth? } }} props
 *   exchange = one doctor message from DoctorPage, with the question that came before it.
 */
export default function EarthSummary({ mission, crewId, exchange }) {
  const [status, setStatus] = useState(exchange?.sentToEarth ? 'sent' : 'idle'); // idle | sending | sent | error
  const [note, setNote] = useState(exchange?.sentToEarth || null); // { sentAt, arrivesAt } from the server
  const [saved, setSaved] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const surgeon = mission?.flightSurgeonOnEarth || 'the flight surgeon';

  useEffect(() => {
    if (status !== 'sent') return undefined;
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, [status]);

  async function send() {
    setStatus('sending');
    try {
      const data = await apiFetch(`/api/surgeon/${encodeURIComponent(crewId || 'sara')}/notes`, {
        method: 'POST',
        body: {
          messageId: exchange.id,
          question: exchange.question,
          reply: exchange.text,
          redFlag: exchange.redFlag,
          redFlagReason: exchange.redFlagReason,
          sources: exchange.sources,
        },
      });
      setNote(data.note);
      setSaved(data.saved !== false);
      setNow(Date.now());
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  if (!exchange?.question) return null;

  if (status !== 'sent') {
    return (
      <section className={s.earthRow} aria-label="Send this answer to Earth">
        <button type="button" className={s.linkBtn} onClick={send} disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : status === 'error' ? 'Couldn’t send. Try again' : `Send to ${surgeon}`}
        </button>
        <span className={s.small}>Only this answer. You decide what goes to Earth.</span>
      </section>
    );
  }

  const sentAt = new Date(note.sentAt).getTime();
  const arrivesAt = new Date(note.arrivesAt).getTime();
  const delayMs = Math.max(1, arrivesAt - sentAt);
  const elapsed = Math.max(0, now - sentAt);
  const pct = Math.min(100, Math.round((elapsed / delayMs) * 100));
  const replyMin = Math.max(0, Math.round((sentAt + 2 * delayMs - now) / 60000));
  const replyText = replyMin > 0 ? `reply in about ${replyMin} min` : 'reply due now';

  return (
    <section className={`${s.earth} ${s.earthRow}`} aria-label="Answer sent to Earth">
      <div className={s.track}>
        <span className={s.shipDot} aria-hidden="true" />
        <div className={s.line} role="img" aria-label={`Sent ${pct} percent of the way to Earth`}>
          <span className={s.lineDone} style={{ width: `${pct}%` }} />
          <span className={s.lineTodo} style={{ left: `${pct}%` }} />
          {pct < 100 && (
            <span className={s.pulse} style={{ left: `${pct}%` }}>
              <span className={s.ping} />
            </span>
          )}
        </div>
        <img src="/images/earth.png" alt="Earth" className={s.earthImg} />
      </div>
      <span className={s.summaryText}>
        <strong className={s.strong}>Sent to {surgeon}</strong>
        {pct < 100 ? ` · ${pct}% of the way · arrives ${clock(arrivesAt)}, ${replyText}` : ` · arrived ${clock(arrivesAt)}, ${replyText}`}
      </span>
      {!saved && <span className={s.small}>Not saved: the ship's database is offline.</span>}
    </section>
  );
}
