// A small context line on the Results page for a crew member who tracks her cycle (owner: Malak).
// Context only: it never says the cycle caused today's score. PRIVATE: it is drawn from her own cycle
// data (Layal's GET /api/womens/cycle), only on her own screen, and it is never saved with the
// check-in or sent anywhere else. Layal's files are only read here, never changed.
import { useEffect, useState } from 'react';
import ListRow from '../../shared/ListRow.jsx';
import { apiFetch } from '../../shared/api.js';
import { useSession } from '../../shared/session.js';
import { computeCycle, readLocal, todayIso } from '../womens-health/helpers.js';
import s from './styles.module.css';

// data/womens-health.json is one person's private data ("only Sara sees this"), and the cycle
// route would hand it to any crew id. So the line is shown only to the people the data belongs to.
const HAS_CYCLE_DATA = ['sara'];

export default function CycleContext() {
  const session = useSession();
  const crewId = session && session.id;
  const [line, setLine] = useState(null);

  useEffect(() => {
    if (!crewId || !HAS_CYCLE_DATA.includes(crewId)) return undefined;
    let alive = true;
    apiFetch(`/api/womens/cycle?crewId=${encodeURIComponent(crewId)}`)
      .then((res) => {
        const cycle = res && res.data && res.data.cycleTracking;
        if (!alive || !cycle) return;
        // The mode she chose in Profile; the data's own mode if she never chose.
        const saved = readLocal(`nabd-cycle-mode-${crewId}`, null);
        const mode = saved === 'cycle' || saved === 'suppression' ? saved : res.data.activeMode;
        if (mode === 'suppression') {
          setLine({
            title: 'Period suppression',
            subtitle: 'On continuous pill · your cycle can still affect your energy.',
          });
          return;
        }
        const now = computeCycle(cycle, res.logs || [], todayIso());
        setLine({
          title: `Cycle day ${now.day} · ${now.phaseName} phase`,
          subtitle: 'Your cycle can affect your energy',
        });
      })
      .catch(() => {
        // It is only context: without it the page simply shows nothing here.
      });
    return () => {
      alive = false;
    };
  }, [crewId]);

  if (!line) return null;
  return (
    <section className={s.cycleLine} aria-label="Cycle">
      <ListRow
        to="/body/cycle"
        icon={
          <svg className={s.cycleIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" strokeLinejoin="round" />
          </svg>
        }
        title={line.title}
        subtitle={line.subtitle}
        right={
          <span className={s.chevron} aria-hidden="true">
            ›
          </span>
        }
      />
    </section>
  );
}
