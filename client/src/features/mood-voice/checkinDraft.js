// The check-in being filled in right now (owner: Malak).
//
// The record page measures the face and the voice, then the pollen catch game runs in
// between, and only the results page saves everything. Navigation state alone would be
// lost if the game page did not pass it on, so the draft is also kept in sessionStorage:
// it belongs to this tab only and goes away when the tab closes.
//
// Face and voice numbers are private to the crew member and never go to Mission Control.
const KEY = 'nabd-checkin-draft';

export function saveDraft(draft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...draft, at: Date.now() }));
  } catch {
    // storage blocked: the navigation state still carries the numbers
  }
}

export function readDraft() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // nothing to do
  }
}
