// The Vibration API works on Android Chrome; iPhones ignore it, so the screen always shows the ripple too.
export function buzzThreeTimes() {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  return navigator.vibrate([200, 120, 200, 120, 200]);
}
