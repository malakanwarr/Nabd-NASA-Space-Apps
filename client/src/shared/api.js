// Talks to the server (Malak only). JSON in, JSON out, readable error on failure.
//
// "Works without Earth": every successful GET of sample data or check-ins is kept on the phone.
// If the server cannot be reached, the saved copy is returned and wasSavedCopy(path) is true until the next
// successful load.
//
// Store and forward: if saving a game result or a check-in (POST /api/game, POST /api/mood) fails because there is
// no connection or the server is down, the request waits in the outbox on the phone and apiFetch answers
// { ...body, queued: true } instead of an error. The outbox is sent when the phone is back online, when the app
// opens, and after any request that works. Other POSTs (hugs, doctor, sign-in...) still fail with a readable error.
const BASE = import.meta.env.VITE_API_URL || '';

const SAVED_PREFIX = 'nabd-saved-api:';
const ALL_SAVED_PREFIX = 'nabd-saved-'; // also covers the copies kept by features/mood-face/savedData.js
const SAVEABLE = /^\/api\/(data\/|mood|game)/; // only sample data, check-ins and game history
const QUEUEABLE = /^\/api\/(game|mood)(\?|$)/; // the two saves that may wait for a connection
const OUTBOX_KEY = 'nabd-outbox'; // kept on sign out: waiting results must not be lost
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

// ---------- Outbox (store and forward) ----------
function readOutbox() {
  try {
    const list = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeOutbox(list) {
  try {
    if (list.length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(list));
    else localStorage.removeItem(OUTBOX_KEY);
  } catch {
    // storage blocked or full: waiting results cannot be kept
  }
}

// How many results are waiting on this phone to be sent.
export function pendingCount() {
  return readOutbox().length;
}

function addToOutbox(path, body) {
  const list = readOutbox();
  list.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, path, body, at: Date.now() });
  writeOutbox(list);
}

let flushing = false;

// Sends the waiting results one by one, oldest first. An item leaves the outbox only after the server answered:
// 2xx means it was saved, 4xx means it never will be (so it is dropped), 5xx or no connection means try later.
export async function flushOutbox() {
  if (flushing) return;
  flushing = true;
  try {
    for (const item of readOutbox()) {
      let res;
      try {
        res = await fetch(BASE + item.path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.body),
        });
      } catch {
        break;
      }
      if (res.status >= 500) break;
      writeOutbox(readOutbox().filter((x) => x.id !== item.id));
    }
  } finally {
    flushing = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', flushOutbox);
  setTimeout(flushOutbox, 1000); // the app just opened: send anything that was waiting
}

// A short plain-English message for an error answer (the server's own message wins when it has one).
function friendlyError(status) {
  if (status >= 500) return "The server isn't answering right now.";
  if (status === 404) return "We couldn't find that.";
  if (status === 401 || status === 403) return 'You need to sign in again.';
  return 'Something went wrong. Please try again.';
}

export async function apiFetch(path, options = {}) {
  const { body, headers, ...rest } = options;
  const method = (rest.method || 'GET').toUpperCase();
  const saveable = method === 'GET' && SAVEABLE.test(path);
  const queueable = method === 'POST' && QUEUEABLE.test(path);
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
    if (queueable) {
      addToOutbox(path, body);
      return { ...body, queued: true };
    }
    throw new Error("Can't reach the server. Check your connection.");
  }
  // A server that is down or asleep (or the dev proxy with no server behind it) answers 5xx: same as no connection.
  if (res.status >= 500 && saveable) {
    const copy = savedAnswer(path, saveable);
    if (copy !== undefined) return copy;
  }
  if (res.status >= 500 && queueable) {
    addToOutbox(path, body);
    return { ...body, queued: true };
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // empty or non-JSON answer
  }
  if (!res.ok) throw new Error((data && data.error) || friendlyError(res.status));
  if (saveable) {
    writeSaved(path, data);
    fromSaved.delete(path);
  }
  if (readOutbox().length) flushOutbox(); // the server answered, so waiting results can go now
  return data;
}
