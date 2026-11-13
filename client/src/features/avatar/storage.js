// localStorage that never throws (owner: Layal). Same style as womens-health/helpers.js.
// writeLocal returns true when it worked, so the page can say so if saving failed.

export function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
