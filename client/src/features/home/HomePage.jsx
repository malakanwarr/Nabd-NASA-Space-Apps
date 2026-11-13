import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import Button from '../../shared/Button.jsx';
import StatusLabel from '../../shared/StatusLabel.jsx';
import ListRow from '../../shared/ListRow.jsx';
import { getSampleData } from '../../shared/sampleData.js';
import { apiFetch } from '../../shared/api.js';
import { useSession } from '../../shared/session.js';
import OrbitMap from './OrbitMap.jsx';
import ReadinessRing from './ReadinessRing.jsx';
import HeartbeatLine from './HeartbeatLine.jsx';
import {
  greeting,
  formatKm,
  formatDelay,
  toneFromLabel,
  buildAttentionRows,
  buildForYouRows,
} from './homeData.js';
import s from './homePage.module.css';

const FILES = ['today', 'mission', 'body-systems', 'baseline', 'hugs', 'profile', 'reaction-tests'];

function Skeleton() {
  return (
    <main className={s.page} aria-busy="true" aria-label="Loading Home">
      <div className={`${s.skel} ${s.skelTitle}`} />
      <div className={`${s.skel} ${s.skelOrbit}`} />
      <div className={`${s.skel} ${s.skelRow}`} />
      <div className={`${s.skel} ${s.skelButton}`} />
      <div className={`${s.skel} ${s.skelCard}`} />
      <div className={`${s.skel} ${s.skelRow}`} />
      <div className={`${s.skel} ${s.skelRow}`} />
    </main>
  );
}

export default function HomePage() {
  const session = useSession();
  const [state, setState] = useState({ status: 'loading', data: null });
  const [checkedInToday, setCheckedInToday] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null });
    Promise.all(FILES.map((f) => getSampleData(f)))
      .then(([today, mission, bodySystems, baseline, hugs, profile, reaction]) => {
        if (cancelled) return;
        setState({
          status: 'ready',
          data: { today, mission, bodySystems, baseline, hugs, profile, reaction },
        });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', data: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  // Optional: is today's check-in already saved? If the request fails, Home just shows no link.
  const crewId = session?.id;
  const missionDay = state.data?.today?.missionDay;
  useEffect(() => {
    if (!crewId || missionDay === undefined) return undefined;
    let cancelled = false;
    apiFetch(`/api/mood?crewId=${encodeURIComponent(crewId)}`)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.entries ?? res?.moods ?? res?.data ?? []);
        setCheckedInToday(list.some((e) => Number(e.missionDay) === Number(missionDay)));
      })
      .catch(() => {
        if (!cancelled) setCheckedInToday(false);
      });
    return () => {
      cancelled = true;
    };
  }, [crewId, missionDay]);

  if (state.status === 'loading') return <Skeleton />;

  if (state.status === 'error') {
    return (
      <main className={s.page}>
        <div className={s.error} role="alert">
          <h1 className={s.errorTitle}>Home didn’t load</h1>
          <p className={s.muted}>Check that the server is running, then try again.</p>
          <Button variant="secondary" onClick={load}>
            Try again
          </Button>
        </div>
      </main>
    );
  }

  const { today, mission, bodySystems, baseline, hugs, profile, reaction } = state.data;
  const garden = reaction.crewGreenhouse.myGarden;
  const firstName = (session?.name || profile.preferredName || '').split(' ')[0];
  const tone = toneFromLabel(today.readiness.label);
  const attention = buildAttentionRows({ systems: bodySystems.systems, today, baseline });
  const forYou = buildForYouRows({ garden, hugs, profile });

  return (
    <main className={s.page}>
      <div className={s.top}>
        <ScreenHeader
          eyebrow={`Mars transit · day ${today.missionDay}`}
          title={`${greeting(new Date())}, ${firstName}`}
        />
        <Link to="/profile" className={s.avatarLink} aria-label="Profile and settings">
          <span className={s.avatar}>{profile.initials}</span>
        </Link>
      </div>

      <HeartbeatLine bpm={today.vitals.heartRateBpm} />

      <OrbitMap day={today.missionDay} totalDays={mission.marsArrivalMissionDay} />

      <dl className={s.stats}>
        <div className={s.stat}>
          <dt className={s.statLabel}>from Earth</dt>
          <dd className={s.statValue}>{formatKm(mission.distanceFromEarthKm)}</dd>
        </div>
        <div className={s.stat}>
          <dt className={s.statLabel}>message delay</dt>
          <dd className={s.statValue}>{formatDelay(mission.earthDelayOneWay)}</dd>
        </div>
        <div className={s.stat}>
          <dt className={s.statLabel}>to Mars</dt>
          <dd className={s.statValue}>{mission.daysToMars} days</dd>
        </div>
      </dl>
      <p className={s.source}>Distance and delay: NASA data, illustrative for this demo.</p>

      <section className={s.cta}>
        <Button variant="primary" to="/checkin">
          Start today’s check-in · 4 min
        </Button>
        <p className={s.streak}>{garden.streakDays}-day streak · keep it going</p>
        {checkedInToday && (
          <div className={s.results}>
            <Button variant="text" to="/checkin/results">
              See today’s results
            </Button>
          </div>
        )}
      </section>

      <section className={s.readiness} aria-label="Readiness">
        <ReadinessRing value={today.readiness.score} label={today.readiness.label} tone={tone} />
        <div>
          <p className={s.eyebrow}>Readiness</p>
          <p className={`${s.readyLabel} ${s[`tone_${tone}`]}`}>{today.readiness.label}</p>
          <p className={s.muted}>Short sleep is lowering it</p>
        </div>
      </section>

      <section>
        <div className={s.sectionHead}>
          <h2 className={s.h2}>Needs attention</h2>
          <Button variant="text" to="/body">
            All body systems
          </Button>
        </div>
        {attention.length === 0 ? (
          <p className={s.muted}>Everything is stable today.</p>
        ) : (
          <div>
            {attention.map((r) => (
              <ListRow
                key={r.id}
                title={r.title}
                subtitle={r.subtitle}
                right={<StatusLabel status={r.status} />}
                to="/body"
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className={s.h2}>For you</h2>
        <div>
          {forYou.map((r) => (
            <ListRow
              key={r.id}
              title={r.title}
              subtitle={r.subtitle}
              to={r.to}
              right={
                <span className={s.chevron} aria-hidden="true">
                  ›
                </span>
              }
            />
          ))}
        </div>
      </section>
    </main>
  );
}
