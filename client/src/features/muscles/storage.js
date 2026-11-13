// Dates and localStorage that never throws (owner: Layal). Same style as womens-health/helpers.js.
// writeLocal returns true when it worked, so the page can say so if saving failed.

// Today's date on the phone as YYYY-MM-DD (local time, not UTC).
export function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isIsoDate(text) {
  return typeof text === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(text);
}

// Whole days from one YYYY-MM-DD to another (no time zone or daylight-saving surprises).
export function daysBetween(fromIso, toIso) {
  const utc = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(toIso) - utc(fromIso)) / 86400000);
}

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
