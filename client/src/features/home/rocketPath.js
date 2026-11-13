export function pointOnPath(pathEl, t) {
  const len = pathEl.getTotalLength();
  const p = pathEl.getPointAtLength(len * t);
  const q = pathEl.getPointAtLength(Math.min(len * t + 1, len));
  const angle = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
  return { x: p.x, y: p.y, angle };
}

export const ROCKET_STILL_T = 142 / 210; // day 142 of 210, about two-thirds
