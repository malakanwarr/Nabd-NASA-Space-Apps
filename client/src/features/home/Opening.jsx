// Opening animation (owner: Hana Sakr). Shown by App.jsx while the app loads: no props, no data, no navigation.
// Image credits: the planet images came from the team's "Real Space" file. Before submitting, find the
// original source (NASA Blue Marble / Black Marble or similar) and give it to Layal for the data log.
import Planet from '../../shared/Planet.jsx';
import { ROCKET_STILL, ROUTE } from './rocketPath.js';
import s from './styles.module.css';

// The design canvas. The art layer keeps this shape and covers the screen, so the route meets both planets
// on every phone.
const W = 390;
const H = 844;
const pct = (n, of) => `${(n / of) * 100}%`;
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

// Drawn pointing UP (nose at the top). The moving copy is turned 90 degrees so rotate="auto" keeps the
// nose along the route.
function RocketShape() {
  return (
    <>
      <path d="M-3.5 3 L-8 10 L-3.5 8 Z" className={s.fin} />
      <path d="M3.5 3 L8 10 L3.5 8 Z" className={s.fin} />
      <path d="M-2.2 8 L0 14 L2.2 8 Z" className={s.flame} />
      <path d="M0 -12 C5 -7 5 5 3.5 8 L-3.5 8 C-5 5 -5 -7 0 -12 Z" className={s.body} />
      <circle cx="0" cy="-3" r="2.2" className={s.window} />
    </>
  );
}

export default function Opening() {
  return (
    <div className={s.opening} role="status" aria-live="polite">
      <div className={s.stage}>
        <div className={s.art}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={s.sky} aria-hidden="true">
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

            {/* The route: a dotted guide, and a blue line that draws in as the rocket flies. */}
            <path d={ROUTE} className={s.routeGuide} />
            <path d={ROUTE} pathLength="100" className={s.routeLine} />

            {/* The rocket launches from Earth, flies up the curve nose first, arrives at Mars and fades. */}
            <g className={s.rocketMoving}>
              <animateMotion
                dur="7s"
                repeatCount="indefinite"
                rotate="auto"
                path={ROUTE}
                keyPoints="0;1;1"
                keyTimes="0;0.7;1"
                calcMode="spline"
                keySplines="0.42 0 0.58 1;0 0 1 1"
              />
              <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.7;0.78;1" dur="7s" repeatCount="indefinite" />
              <g transform="rotate(90)">
                <RocketShape />
              </g>
            </g>
            {/* Less motion: the rocket waits two-thirds of the way, nose along the route. */}
            <g className={s.rocketStill} transform={ROCKET_STILL}>
              <RocketShape />
            </g>
          </svg>

          {/* Above the route, so the line starts at Earth's rim and ends at Mars's. */}
          <div className={s.planetBox} style={{ left: pct(-110, W), bottom: pct(-70, H), width: pct(320, W) }}>
            <Planet kind="earth" size="100%" />
          </div>
          <div className={s.planetBox} style={{ right: pct(-36, W), top: pct(72, H), width: pct(150, W) }}>
            <Planet kind="mars" size="100%" />
          </div>
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
