import { savedAt, wasSavedCopy } from '../../shared/api.js';

// Saved copies of the data Habiba's screens need (owner: Habiba).
// "Local first, sync later": after every successful load we keep a small copy on the phone. When the
// server cannot be reached (no connection), the screen shows that copy and says so.
//
// Only the few fields a screen needs are saved, never the raw files. Sign out clears every copy.
const PREFIX = 'nabd-saved-';

function read(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // storage blocked or full: the screen still works, it just has no saved copy
  }
}

// load() must return the small object the screen needs, and must throw if nothing real could be loaded.
// paths: the API paths load() reads. If shared/api.js answered any of them from its own saved copy,
// the data is old: report saved: true, with the oldest copy time, and keep our own copy as it was.
// Returns { data, saved, at }: saved is true when the data comes from a copy kept on the phone.
export async function loadWithSavedCopy(key, load, paths = []) {
  try {
    const data = await load();
    const old = paths.filter(wasSavedCopy);
    if (old.length) return { data, saved: true, at: Math.min(...old.map(savedAt)) };
    write(key, data);
    return { data, saved: false, at: null };
  } catch (err) {
    const copy = read(key);
    if (copy) return { data: copy.data, saved: true, at: copy.at };
    throw err;
  }
}

export function clearSavedCopies() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // nothing to clear
  }
}
