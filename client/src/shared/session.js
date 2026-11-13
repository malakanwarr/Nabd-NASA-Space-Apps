// Sign-in session (Malak only). Sign-in is simulated in this prototype: nothing is checked securely.
// role is 'crew', 'admin' or 'family'.
import { useSyncExternalStore } from 'react';

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
//   ?as=sara -> crew Sara, ?as=admin -> admin, ?as=out -> signed out
if (import.meta.env.DEV) {
  const as = new URLSearchParams(window.location.search).get('as');
  if (as === 'sara') signIn({ role: 'crew', id: 'sara', name: 'Sara Haddad' });
  else if (as === 'admin') signIn({ role: 'admin', id: 'admin', name: 'Mission Control' });
  else if (as === 'out') signOut();
}
