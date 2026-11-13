// The saved avatars for the signed-in crew member (owner: Habiba; reads Layal's avatar data only).
// The avatar maker saves them in localStorage `nabd-avatars-<crewId>`. normalize() fills anything missing
// with the default look, so Omar, Laila, Mona and "you" always have a complete avatar.
// They are read again when the page opens, when the tab comes back and when another tab saves.
import { useEffect, useState } from 'react';
import { PEOPLE, normalize } from '../avatar/avatarOptions.js';
import { readLocal } from '../avatar/storage.js';

export function readAvatars(crewId) {
  return normalize(readLocal(`nabd-avatars-${crewId}`, null));
}

export function useAvatars(crewId) {
  const [avatars, setAvatars] = useState(() => readAvatars(crewId));

  useEffect(() => {
    const reload = () => setAvatars(readAvatars(crewId));
    reload();
    window.addEventListener('focus', reload);
    window.addEventListener('pageshow', reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener('focus', reload);
      window.removeEventListener('pageshow', reload);
      window.removeEventListener('storage', reload);
    };
  }, [crewId]);

  return avatars;
}

export const FAMILY_IDS = ['omar', 'laila', 'mona'];
export const personMeta = (id) => PEOPLE.find((p) => p.id === id);
