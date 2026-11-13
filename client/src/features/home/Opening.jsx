// Opening animation (owner: Hana Sakr). Placeholder: shown while the app loads. Replace with the real animation.
import Planet from '../../shared/Planet.jsx';
import s from './styles.module.css';

// TODO:
//  - Rocket from Earth to Mars with SVG animateMotion
//  - Spinning planets
//  - Heartbeat line
//  - Loading bar
export default function Opening() {
  return (
    <div className={s.opening}>
      <div>
        <Planet kind="earth" size={96} />
        <h1>NABD</h1>
        <p>Loading…</p>
      </div>
    </div>
  );
}
