// "Summary to Earth" strip under the chat (owner: Hana Haytham). Design: Doctor.dc.html.
// She chooses to send (her profile says data goes to the flight surgeon "by choice"), then the line
// fills in real time over the one-way delay from mission.json. Simulated in the prototype.
import { useEffect, useState } from 'react';
import s from './styles.module.css';

function clock(ms) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function EarthSummary({ mission }) {
  const [sentAt, setSentAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const delay = mission?.earthDelayOneWay;
  const delayMs = delay ? (delay.minutes * 60 + delay.seconds) * 1000 : null;
  const surgeon = mission?.flightSurgeonOnEarth || 'the flight surgeon';

  useEffect(() => {
    if (!sentAt) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, [sentAt]);

  if (!delayMs) return null;

  if (!sentAt) {
    return (
      <section className={s.earth} aria-label="Summary for Earth">
        <button
          type="button"
          className={s.linkBtn}
          onClick={() => {
            const t = Date.now();
            setSentAt(t);
            setNow(t);
          }}
        >
          Send a summary to {surgeon}
        </button>
        <span className={s.small}>Only what you discussed here. You decide what goes to Earth.</span>
      </section>
    );
  }

  const elapsed = Math.max(0, now - sentAt);
  const pct = Math.min(100, Math.round((elapsed / delayMs) * 100));
  const arrives = sentAt + delayMs;
  const replyMin = Math.max(0, Math.round((sentAt + 2 * delayMs - now) / 60000));
  const replyText = replyMin > 0 ? `reply in about ${replyMin} min` : 'reply due now';

  return (
    <section className={s.earth} aria-label="Summary sent to Earth">
      <div className={s.track}>
        <span className={s.shipDot} aria-hidden="true" />
        <div className={s.line} role="img" aria-label={`Summary ${pct} percent of the way to Earth`}>
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
        <strong className={s.strong}>Summary to {surgeon}</strong>
        {pct < 100 ? ` · ${pct}% of the way · arrives ${clock(arrives)}, ${replyText}` : ` · arrived ${clock(arrives)}, ${replyText}`}
      </span>
    </section>
  );
}
