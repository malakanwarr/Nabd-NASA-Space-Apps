// Profile and settings (owner: Habiba). Board 19, route /profile. Opens from the avatar on Home.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import ListRow from '../../shared/ListRow.jsx';
import Chip from '../../shared/Chip.jsx';
import Button from '../../shared/Button.jsx';
import { getSampleData } from '../../shared/sampleData.js';
import { signOut, useSession } from '../../shared/session.js';
import { getTheme, setTheme } from '../../shared/theme.js';
import Avatar from './Avatar.jsx';
import s from './styles.module.css';

const THEMES = [
  { value: 'system', label: 'System', hint: "Follows your phone's setting." },
  { value: 'light', label: 'Light', hint: 'Light everywhere. Easier to read in bright modules.' },
  { value: 'dark', label: 'Dark', hint: 'Dark everywhere. Easier on the eyes at night.' },
];

// Period tracking mode, read by Layal's cycle screen: localStorage key nabd-cycle-mode-<crewId>, "cycle" or "suppression".
const CYCLE_MODES = [
  { value: 'cycle', label: 'Cycle tracking', hint: 'Follows your cycle and your next period.' },
  { value: 'suppression', label: 'Period suppression', hint: 'Tracks your daily pill and how many are left.' },
];

function readCycleMode(crewId) {
  try {
    const saved = localStorage.getItem(`nabd-cycle-mode-${crewId}`);
    return saved === 'suppression' ? 'suppression' : 'cycle';
  } catch {
    return 'cycle';
  }
}

function Chevron() {
  return <span className={s.chevron} aria-hidden="true">›</span>;
}

export default function ProfilePage() {
  const session = useSession();
  const navigate = useNavigate();
  const [theme, setThemeChoice] = useState(getTheme());
  const [cycleMode, setCycleMode] = useState(() => readCycleMode(session?.id));
  const [data, setData] = useState({ state: 'loading' }); // loading | ready | error

  useEffect(() => {
    let cancelled = false;
    Promise.all([getSampleData('crew'), getSampleData('mission')])
      .then(([crew, mission]) => {
        if (cancelled) return;
        const me = crew.crew?.find((c) => c.id === session?.id) ?? null;
        setData({ state: 'ready', me, surgeon: crew.mission?.flightSurgeon ?? mission.flightSurgeonOnEarth, missionName: mission.name });
      })
      .catch(() => {
        if (!cancelled) setData({ state: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  function chooseTheme(value) {
    setTheme(value);
    setThemeChoice(value);
  }

  function chooseCycleMode(value) {
    try {
      localStorage.setItem(`nabd-cycle-mode-${session?.id}`, value);
    } catch {
      // storage blocked: the choice still shows for this visit
    }
    setCycleMode(value);
  }

  function leave() {
    signOut();
    navigate('/signin');
  }

  const name = session?.name ?? 'Crew member';
  const missionName = data.missionName?.replace(/\s*\(.*\)/, '');
  const current = THEMES.find((t) => t.value === theme) ?? THEMES[0];
  const currentCycle = CYCLE_MODES.find((m) => m.value === cycleMode) ?? CYCLE_MODES[0];

  return (
    <main>
      <ScreenHeader backTo="/" backLabel="Home" eyebrow="Profile and settings" title={name} />

      <div className={s.identity}>
        <Avatar avatar={data.me?.avatar} name={name} />
        <p className={s.role}>
          {data.state === 'loading' && 'Loading your details…'}
          {data.state === 'error' && "We couldn't load your details."}
          {data.state === 'ready' && [data.me?.role, missionName].filter(Boolean).join(' · ')}
        </p>
      </div>

      <h2 className={s.label}>Appearance</h2>
      <div className={s.themes} role="group" aria-label="Appearance">
        {THEMES.map((t) => (
          <Chip key={t.value} selected={theme === t.value} onClick={() => chooseTheme(t.value)}>
            {t.label}
          </Chip>
        ))}
      </div>
      <p className={s.hint}>{current.hint}</p>

      <h2 className={s.label}>Period tracking</h2>
      <div className={s.modes} role="group" aria-label="Period tracking">
        {CYCLE_MODES.map((m) => (
          <Chip key={m.value} selected={cycleMode === m.value} onClick={() => chooseCycleMode(m.value)}>
            {m.label}
          </Chip>
        ))}
      </div>
      <p className={s.hint}>{currentCycle.hint} Only you can see this.</p>

      <h2 className={s.label}>Who sees what</h2>
      <ListRow title="Mission Control" right={<span className={s.right}>Status, check-ins, alerts</span>} />
      <ListRow title={data.surgeon ?? 'Flight surgeon'} right={<span className={s.right}>Medical details</span>} />
      <ListRow title="Your family" right={<span className={s.right}>Hugs and a simple status</span>} />
      <ListRow title="Only you" right={<span className={s.right}>Cycle, face and voice details</span>} />

      <div className={s.account}>
        <ListRow title="Switch crew member" to="/signin" right={<Chevron />} />
        <ListRow title="Change PIN" to="/signin" right={<Chevron />} />
        <Button variant="text" onClick={leave}>Sign out</Button>
      </div>
    </main>
  );
}
