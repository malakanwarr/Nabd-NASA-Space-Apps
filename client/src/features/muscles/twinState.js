// Shared by the twin page and workout mode (owner: Layal).
import { normalize as normalizeAvatars } from '../avatar/avatarOptions.js';
import { applyDrop, freshState, normalize } from './muscleModel.js';
import { readLocal, todayIso } from './storage.js';

export function twinKey(crewId) {
  return `nabd-muscles-${crewId}`;
}

// The saved twin with today's daily drop applied. empty: nothing was saved yet (sample model).
export function loadTwin(crewId) {
  const today = todayIso();
  const saved = normalize(readLocal(twinKey(crewId), null), today);
  return { model: applyDrop(saved || freshState(today), today), empty: !saved };
}

// Her avatar (Make your avatar): people.you, normalized. Nothing saved: the avatar defaults.
export function readYou(crewId) {
  return normalizeAvatars(readLocal(`nabd-avatars-${crewId}`, null)).you;
}

// Body shape from her avatar: people.you.gender. Nothing saved: female (the avatar default).
export function readGender(crewId) {
  return readYou(crewId).gender === 'male' ? 'male' : 'female';
}
