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
  const [still, setStill] = useState(null);

  // Reduce Motion: SMIL is not switched off by theme.css, so keep the rocket still ourselves.
  useLayoutEffect(() => {
    if (reduced && routeRef.current) setStill(pointOnPath(routeRef.current, ROCKET_STILL_T));
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

          {reduced ? (
            still && (
              <g transform={`translate(${still.x} ${still.y}) rotate(${still.angle})`}>
                <Rocket />
              </g>
            )
          ) : (
            <g>
              <Rocket />
              <animateMotion dur="8s" rotate="auto" fill="freeze" repeatCount="1" begin="0s">
                <mpath href="#route" />
              </animateMotion>
            </g>
          )}
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
