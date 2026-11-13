import { useLayoutEffect, useRef, useState } from 'react';
import Planet from '../../shared/Planet.jsx';
import { pointOnPath, ROCKET_STILL_T } from '../home/rocketPath.js';
import styles from './desktopLoading.module.css';

const WIDTH = 1600;
const HEIGHT = 800;
const MARS = { x: 1180, y: 220 };
const EARTH = { x: 420, y: 590 };
const ROUTE = 'M 450 540 C 520 250, 940 110, 1130 250';
const FLIGHT_MS = 3000;
const ECG = 'M0 12 L50 12 L58 6 L66 18 L76 1 L86 23 L94 12 L160 12';

function createStars() {
  let seed = 19;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  return Array.from({ length: 72 }, (_, index) => ({
    x: random() * WIDTH,
    y: random() * HEIGHT,
    radius: 0.6 + random() * 0.9,
    opacity: 0.35 + random() * 0.55,
    twinkle: index % 4 === 0,
    delay: `${(random() * 4).toFixed(1)}s`,
  }));
}

const STARS = createStars();

function Rocket() {
  return (
    <g>
      <path d="M-12 -2 L-21 0 L-12 2 Z" className={styles.desktopLoadingFlame} />
      <path d="M-4 -5 L-13 -11 L-12 -3 Z" className={styles.desktopLoadingFin} />
      <path d="M-4 5 L-13 11 L-12 3 Z" className={styles.desktopLoadingFin} />
      <path d="M15 0 C9 -6 -6 -6 -12 -4 L-12 4 C-6 6 9 6 15 0 Z" className={styles.desktopLoadingRocketBody} />
      <circle cx="3" cy="0" r="2.5" className={styles.desktopLoadingWindow} />
    </g>
  );
}

export default function DesktopLoadingPage() {
  const reduced = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )[0];
  const routeRef = useRef(null);
  const rocketRef = useRef(null);

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
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / FLIGHT_MS, 1);
      place(progress * progress * (3 - 2 * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  return (
    <div className={styles.desktopLoading} role="status" aria-live="polite">
      <div className={styles.desktopLoadingStage}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={styles.desktopLoadingSky} aria-hidden="true">
          {STARS.map((star, index) => (
            <circle
              key={index}
              cx={star.x}
              cy={star.y}
              r={star.radius}
              className={star.twinkle ? styles.desktopLoadingStarTwinkle : styles.desktopLoadingStar}
              style={
                star.twinkle
                  ? { animationDelay: star.delay, opacity: star.opacity }
                  : { opacity: star.opacity }
              }
            />
          ))}
          <path ref={routeRef} d={ROUTE} className={styles.desktopLoadingRoute} />
          <g ref={rocketRef}>
            <Rocket />
          </g>
        </svg>

        <div
          className={styles.desktopLoadingPlanet}
          style={{ left: `${(MARS.x / WIDTH) * 100}%`, top: `${(MARS.y / HEIGHT) * 100}%` }}
        >
          <Planet kind="mars" size={112} />
        </div>
        <div
          className={styles.desktopLoadingPlanet}
          style={{ left: `${(EARTH.x / WIDTH) * 100}%`, top: `${(EARTH.y / HEIGHT) * 100}%` }}
        >
          <Planet kind="earth" size={144} />
        </div>

        <div className={styles.desktopLoadingCenter}>
          <h1 className={styles.desktopLoadingLogo}>NABD</h1>
          <svg viewBox="0 0 160 24" className={styles.desktopLoadingEcg} aria-hidden="true">
            <path d={ECG} className={styles.desktopLoadingEcgBase} />
            <path d={ECG} className={styles.desktopLoadingEcgSweep} pathLength="100" />
          </svg>
          <p className={styles.desktopLoadingTagline}>
            SPACE HEALTH ·{' '}
            <span dir="rtl" lang="ar">
              نبض
            </span>
          </p>
        </div>

        <div className={styles.desktopLoadingBottom}>
          <div className={styles.desktopLoadingTrack}>
            <div className={styles.desktopLoadingFill} />
          </div>
          <p className={styles.desktopLoadingText}>Loading your health data · works offline</p>
        </div>
      </div>
    </div>
  );
}
