// Sign-in session (Malak only). Sign-in is simulated in this prototype: nothing is checked securely.
// role is 'crew', 'admin' or 'family'.
import { useSyncExternalStore } from 'react';
import { clearSavedApi } from './api.js';
import { getSampleData } from './sampleData.js';

const KEY = 'nabd-session';
const listeners = new Set();

export function getSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function notify() {
  listeners.forEach((fn) => fn());
}

export function signIn(session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // storage blocked
  }
  cached = undefined;
  notify();
}

export function signOut() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // storage blocked
  }
  clearSavedApi(); // the next person on this phone must not see the saved copies
  cached = undefined;
  notify();
}

// React hook: re-renders when the session changes. Keeps the same object between renders.
let cached;
export function useSession() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => {
      if (cached === undefined) cached = getSession();
      return cached;
    },
  );
}

// Developer shortcut (only in `npm run dev`, never in the deployed build):
//   ?as=sara, ?as=adam, ?as=mei, ?as=lucas -> that crew member (any id in data/crew.json)
//   ?as=admin -> Mission Control, ?as=out -> signed out
function signInAsCrewMember(id) {
  getSampleData('crew')
    .then((file) => {
      const member = (file.crew || []).find((c) => c.id === id);
      if (member) signIn({ role: 'crew', id: member.id, name: member.name });
      else console.warn(`[dev] ?as=${id}: there is no crew member with that id in data/crew.json`);
    })
    .catch(() => console.warn(`[dev] ?as=${id}: could not load data/crew.json. Is the server running?`));
}

if (import.meta.env.DEV) {
  const as = (new URLSearchParams(window.location.search).get('as') || '').toLowerCase();
  if (as === 'sara') signIn({ role: 'crew', id: 'sara', name: 'Sara Haddad' }); // no waiting needed
  else if (as === 'admin') signIn({ role: 'admin', id: 'admin', name: 'Mission Control' });
  else if (as === 'out') signOut();
  else if (as) signInAsCrewMember(as); // adam, mei, lucas: the name comes from data/crew.json
}
