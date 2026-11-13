// Opening animation (owner: Hana Sakr). Shown by App.jsx while the app loads: no props, no data, no navigation.
// Image credits: the planet images came from the team's "Real Space" file. Before submitting, find the
// original source (NASA Blue Marble / Black Marble or similar) and give it to Layal for the data log.
import { useLayoutEffect, useRef, useState } from 'react';
import Planet from '../../shared/Planet.jsx';
import { pointOnPath, ROCKET_STILL_T } from './rocketPath.js';
import s from './styles.module.css';

const W = 360;
const H = 640;
// Same centres in the SVG (units) and for the planets (percent), so they always line up.
const MARS = { x: 280, y: 110 };
const EARTH = { x: 84, y: 500 };
const ROUTE = 'M 118 446 C 20 360, 40 160, 236 124';
const FLIGHT_MS = 3000; // rocket flight time
const ECG = 'M0 12 L50 12 L58 6 L66 18 L76 1 L86 23 L94 12 L160 12';

// Fixed star field (same on every load)
let seed = 7;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const STARS = Array.from({ length: 44 }, (_, i) => ({
  x: rand() * W,
  y: rand() * H,
  r: 0.6 + rand() * 0.9,
  o: 0.35 + rand() * 0.55,
  twinkle: i % 4 === 0,
  delay: `${(rand() * 4).toFixed(1)}s`,
}));

// Rocket art faces right (+x) so rotate="auto" points it along the route.
function Rocket() {
  return (
    <g>
      <path d="M-12 -2 L-21 0 L-12 2 Z" className={s.flame} />
      <path d="M-4 -5 L-13 -11 L-12 -3 Z" className={s.fin} />
      <path d="M-4 5 L-13 11 L-12 3 Z" className={s.fin} />
      <path d="M15 0 C9 -6 -6 -6 -12 -4 L-12 4 C-6 6 9 6 15 0 Z" className={s.body} />
      <circle cx="3" cy="0" r="2.5" className={s.window} />
    </g>
  );
}

export default function Opening() {
  const reduced = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )[0];
  const routeRef = useRef(null);
  const rocketRef = useRef(null);

  // The rocket is moved with JavaScript (works on every browser and phone; SVG animateMotion did not start).
  // Reduce Motion: keep the rocket still, two-thirds along the route (day 142 of 210).
  useLayoutEffect(() => {
    const path = routeRef.current;
    const rocket = rocketRef.current;
    if (!path || !rocket) return undefined;
    const place = (t) => {
      const { x, y, angle } = pointOnPath(path, t);
      rocket.setAttribute('transform', `translate(${x} ${y}) rotate(${angle})`);
    };
    if (reduced) {
      place(ROCKET_STILL_T);
      return undefined;
    }
    place(0);
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / FLIGHT_MS, 1);
      place(p * p * (3 - 2 * p)); // soft start and end
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return (
    <div className={s.opening} role="status" aria-live="polite">
      <div className={s.stage}>
        <svg viewBox={`0 0 ${W} ${H}`} className={s.sky} aria-hidden="true">
          {STARS.map((st, i) => (
            <circle
              key={i}
              cx={st.x}
              cy={st.y}
              r={st.r}
              className={st.twinkle ? s.starTwinkle : s.star}
              style={st.twinkle ? { animationDelay: st.delay, opacity: st.o } : { opacity: st.o }}
            />
          ))}
          <path id="route" ref={routeRef} d={ROUTE} className={s.route} />

          <g ref={rocketRef}>
            <Rocket />
          </g>
        </svg>

        <div
          className={s.planet}
          style={{ left: `${(MARS.x / W) * 100}%`, top: `${(MARS.y / H) * 100}%` }}
        >
          <Planet kind="mars" size={88} />
        </div>
        <div
          className={s.planet}
          style={{ left: `${(EARTH.x / W) * 100}%`, top: `${(EARTH.y / H) * 100}%` }}
        >
          <Planet kind="earth" size={120} />
        </div>

        <div className={s.center}>
          <h1 className={s.logo}>NABD</h1>
          <svg viewBox="0 0 160 24" className={s.ecg} aria-hidden="true">
            <path d={ECG} className={s.ecgBase} />
            <path d={ECG} className={s.ecgSweep} pathLength="100" />
          </svg>
          <p className={s.tagline}>
            SPACE HEALTH ·{' '}
            <span dir="rtl" lang="ar">
              نبض
            </span>
          </p>
        </div>

        <div className={s.bottom}>
          <div className={s.track}>
            <div className={s.fill} />
          </div>
          <p className={s.loading}>Loading your health data · works offline</p>
        </div>
      </div>
    </div>
  );
}
