// Talks to the server (Malak only). JSON in, JSON out, readable error on failure.
//
// "Works without Earth": every successful GET of sample data or check-ins is kept on the phone.
// If the server cannot be reached, the saved copy is returned and wasSavedCopy(path) is true until the next
// successful load. Saving things (POST) is not queued: it still fails with a readable error.
const BASE = import.meta.env.VITE_API_URL || '';

const SAVED_PREFIX = 'nabd-saved-api:';
const ALL_SAVED_PREFIX = 'nabd-saved-'; // also covers the copies kept by features/mood-face/savedData.js
const SAVEABLE = /^\/api\/(data\/|mood)/; // only sample data and check-ins
const fromSaved = new Map(); // path -> time the saved copy was made, for answers that came from the copy

function readSaved(path) {
  try {
    const raw = localStorage.getItem(SAVED_PREFIX + path);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function writeSaved(path, data) {
  try {
    localStorage.setItem(SAVED_PREFIX + path, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // storage blocked or full: no saved copy, everything else still works
  }
}

// True if the last answer for this path was the copy saved on the phone (no connection).
export function wasSavedCopy(path) {
  return fromSaved.has(path);
}

// When that saved copy was made (milliseconds), or null if the last answer was live.
export function savedAt(path) {
  return fromSaved.get(path) ?? null;
}

// Called on sign out, so the next person on this phone does not see the saved copies.
export function clearSavedApi() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(ALL_SAVED_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // nothing to clear
  }
  fromSaved.clear();
}

// The saved answer for this path, or undefined if there is none (or it may not be saved).
function savedAnswer(path, saveable) {
  const copy = saveable ? readSaved(path) : undefined;
  if (copy === undefined) return undefined;
  fromSaved.set(path, copy.at);
  return copy.data;
}

export async function apiFetch(path, options = {}) {
  const { body, headers, ...rest } = options;
  const saveable = (rest.method || 'GET').toUpperCase() === 'GET' && SAVEABLE.test(path);
  let res;
  try {
    res = await fetch(BASE + path, {
      ...rest,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    const copy = savedAnswer(path, saveable);
    if (copy !== undefined) return copy;
    throw new Error('Cannot reach the server. Check that it is running.');
  }
  // A server that is down or asleep (or the dev proxy with no server behind it) answers 5xx: same as no connection.
  if (res.status >= 500 && saveable) {
    const copy = savedAnswer(path, saveable);
    if (copy !== undefined) return copy;
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // empty or non-JSON answer
  }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  if (saveable) {
    writeSaved(path, data);
    fromSaved.delete(path);
  }
  return data;
}
