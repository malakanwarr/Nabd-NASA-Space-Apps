// Spoken coaching with the browser's own speech (owner: Layal). No packages, no network of our own.
// Prefers an English voice stored on the phone (localService), so it works offline; without one the
// browser's default voice is used, and the screen always shows the same words.
// iPhone only allows speech after a tap: the first sentence is spoken inside the Start tap.
// Mute is remembered on the phone: localStorage `nabd-workout-muted`.
import { readLocal, writeLocal } from './storage.js';

const MUTE_KEY = 'nabd-workout-muted';

export function isMuted() {
  return readLocal(MUTE_KEY, false) === true;
}

export function setMuted(value) {
  writeLocal(MUTE_KEY, Boolean(value));
  if (value) stopSpeaking();
}

function synth() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

function pickVoice() {
  const voices = synth()?.getVoices() || [];
  const english = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
  return english.find((v) => v.localService) || english[0] || null;
}

// Says one line, cutting off anything still being said. Quietly does nothing if speech is missing or muted.
export function say(text) {
  const sp = synth();
  if (!sp || isMuted() || !text) return;
  try {
    sp.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.lang = voice?.lang || 'en-US';
    u.rate = 0.95;
    sp.speak(u);
  } catch {
    // speech failed: the screen still shows everything
  }
}

export function stopSpeaking() {
  try {
    synth()?.cancel();
  } catch {
    // nothing to stop
  }
}
