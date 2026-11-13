import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import { signIn } from '../../shared/session.js';
import { verifyCrewPin, WRONG_PIN } from './authApi.js';
import { Avatar } from './CrewTile.jsx';
import PinPad from './PinPad.jsx';
import s from './styles.module.css';

const PIN_LENGTH = 4;
const MAX_TRIES = 3;
const LOCK_SECONDS = 30;
const SHAKE_MS = 600;

function motionAllowed() {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function PinEntry({ crew }) {
  const navigate = useNavigate();
  const alive = useRef(true);
  const [pin, setPin] = useState('');
  const [checking, setChecking] = useState(false);
  const [wrong, setWrong] = useState(0); // wrong tries in this lock cycle
  const [feedback, setFeedback] = useState(null); // { kind: 'wrong' | 'server', text }
  const [shaking, setShaking] = useState(false);
  const [lockUntil, setLockUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const remaining = Math.max(0, Math.ceil((lockUntil - now) / 1000));
  const locked = remaining > 0;

  useEffect(() => {
    if (!lockUntil) return undefined;
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= lockUntil) {
        setLockUntil(0);
        setFeedback(null);
        clearInterval(timer);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [lockUntil]);

  const submit = useCallback(
    async (value) => {
      setChecking(true);
      try {
        const member = await verifyCrewPin(crew.id, value);
        signIn({ role: 'crew', id: member?.id ?? crew.id, name: member?.name ?? crew.name });
        navigate('/', { replace: true });
      } catch (err) {
        if (!alive.current) return;
        setChecking(false);
        if (err?.message === WRONG_PIN) {
          const count = wrong + 1;
          if (count >= MAX_TRIES) {
            const until = Date.now() + LOCK_SECONDS * 1000;
            setWrong(0);
            setNow(Date.now());
            setLockUntil(until);
            setFeedback({ kind: 'wrong', text: '' });
          } else {
            setWrong(count);
            const left = MAX_TRIES - count;
            setFeedback({
              kind: 'wrong',
              text: `That PIN doesn't match. ${left} ${left === 1 ? 'try' : 'tries'} left.`,
            });
          }
          if (motionAllowed()) setShaking(true);
          setTimeout(() => {
            if (!alive.current) return;
            setShaking(false);
            setPin('');
          }, SHAKE_MS);
        } else {
          // Server problem: not counted as a try.
          setFeedback({ kind: 'server', text: "Can't reach the server. Try again." });
          setPin('');
        }
      }
    },
    [crew, navigate, wrong],
  );

  const onDigit = (d) => {
    if (checking || locked || shaking || pin.length >= PIN_LENGTH) return;
    const next = pin + d;
    setPin(next);
    setFeedback(null);
    if (next.length === PIN_LENGTH) submit(next);
  };

  const onDelete = () => {
    if (checking || locked || shaking) return;
    setPin((p) => p.slice(0, -1));
  };

  const first = String(crew.name || '').split(' ')[0];
  const showWrongDots = feedback?.kind === 'wrong' || locked;

  let message = feedback?.text || '';
  if (locked)
    message = `Too many wrong tries. Try again in ${remaining} ${remaining === 1 ? 'second' : 'seconds'}.`;

  return (
    <main className={s.page}>
      <ScreenHeader
        backTo="/signin"
        backLabel="Choose crew member"
        title={`Welcome back, ${first}`}
      />

      <section className={s.pinHero}>
        <Avatar member={crew} className={s.avatarLarge} />
        <p className={s.subtitle}>Enter your 4-digit PIN</p>

        <div
          className={`${s.dots} ${shaking ? s.shake : ''}`}
          role="img"
          aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`}
        >
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <span
              key={i}
              className={`${s.dot} ${i < pin.length ? s.dotFilled : ''} ${showWrongDots ? s.dotWrong : ''}`}
            />
          ))}
        </div>

        <p
          className={`${s.message} ${feedback?.kind === 'server' ? s.messageServer : s.messageWrong}`}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      </section>

      <PinPad onDigit={onDigit} onDelete={onDelete} disabled={checking || locked} />
    </main>
  );
}

export default function PinPage() {
  const { state } = useLocation();
  const crew = state?.crew;
  if (!crew?.id) return <Navigate to="/signin" replace />;
  return <PinEntry crew={crew} />;
}
