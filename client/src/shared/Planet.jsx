// A slowly spinning planet (Malak only). kind: earth | mars. size in pixels.
import s from './shared.module.css';

export default function Planet({ kind = 'earth', size = 120 }) {
  return (
    <div
      className={s.planet}
      role="img"
      aria-label={kind === 'mars' ? 'Mars' : 'Earth'}
      style={{ width: size, height: size, backgroundImage: `url(/images/${kind}_tex.jpg)` }}
    >
      <div className={s.shade} style={{ backgroundImage: `url(/images/shade_${kind}.png)` }} />
    </div>
  );
}
