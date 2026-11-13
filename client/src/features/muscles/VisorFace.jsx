// Her avatar's head inside a helmet visor (owner: Layal): shapes from faceDraw.js, clipped to the visor
// ellipse so a hijab or headwrap frames the face inside the helmet. The head fills about 80% of the visor.
//   kind: 'front' (full face), 'back' (back of the head: hair or covering), 'profile' (side view, facing right)
import { useId } from 'react';
import { backHead, frontFace, placeFront, placeProfile, profileFace } from './faceDraw.js';

export default function VisorFace({ person, kind = 'front', cx, cy, rx, ry, lean = 0 }) {
  const id = useId();
  if (!person) return null;
  const shapes = kind === 'profile' ? profileFace(person) : kind === 'back' ? backHead(person) : frontFace(person);
  const transform = kind === 'profile' ? placeProfile(cx, cy, ry, lean) : placeFront(cx, cy, ry);
  const clip = `visor-${id.replace(/:/g, '')}`;
  return (
    <g aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={lean ? `rotate(${lean} ${cx} ${cy})` : undefined} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <g transform={transform}>
          {shapes.map(({ el: El, attrs }, i) => (
            <El key={i} {...attrs} />
          ))}
        </g>
      </g>
    </g>
  );
}
