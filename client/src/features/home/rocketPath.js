// The rocket's route on the opening screen, in the 390 x 844 design canvas: from Earth's edge (bottom left)
// up the curve to Mars's edge (top right). Opening.jsx draws it; DesktopLoadingPage uses pointOnPath.
export const ROUTE = 'M70 640 C 120 430, 230 300, 320 190';

// Where the rocket waits when the phone asks for less motion: two-thirds of the way (day 142 of 210),
// nose along the route.
export const ROCKET_STILL = 'translate(211.4 329.8) rotate(34.8)';

export function pointOnPath(pathEl, t) {
  const len = pathEl.getTotalLength();
  const p = pathEl.getPointAtLength(len * t);
  const q = pathEl.getPointAtLength(Math.min(len * t + 1, len));
  const angle = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
  return { x: p.x, y: p.y, angle };
}

export const ROCKET_STILL_T = 142 / 210; // day 142 of 210, about two-thirds
