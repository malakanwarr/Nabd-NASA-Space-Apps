import s from './homePage.module.css';

// One ECG beat repeated; the glow sweeps along it slowly. The CSS animation is switched off
// for reduced motion (theme.css and the rule in homePage.module.css).
const BEAT = 'L0 12 L14 12 L18 6 L22 18 L28 1 L34 23 L38 12 L60 12';
const PATH =
  'M0 12 ' +
  [0, 60, 120, 180, 240]
    .map((x) => `M${x} 12 ${BEAT.replace(/L(\d+) /g, (_, n) => `L${Number(n) + x} `)}`)
    .join(' ');

export default function HeartbeatLine({ bpm }) {
  return (
    <div className={s.heart}>
      <span className={s.bpm}>
        <span aria-hidden="true">♥ </span>
        <span className={s.mono}>{bpm}</span> bpm
      </span>
      <svg viewBox="0 0 300 24" className={s.ecg} preserveAspectRatio="none" aria-hidden="true">
        <path d={PATH} className={s.ecgBase} />
        <path d={PATH} className={s.ecgSweep} pathLength="100" />
      </svg>
    </div>
  );
}
