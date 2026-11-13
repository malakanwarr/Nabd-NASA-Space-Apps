// Beeps with Web Audio (owner: Layal). No packages, no sound files: short sine tones made on the phone.
// iPhone only allows sound after a tap, so unlockAudio() is called inside the Start tap.
// The workout's mute (speech.js isMuted) silences beeps and voice together.
import { isMuted } from './speech.js';

let ctx = null;

function audio() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  return ctx;
}

export function unlockAudio() {
  const a = audio();
  try {
    if (a && a.state === 'suspended') a.resume();
  } catch {
    // no sound: the screen still shows everything
  }
}

// One soft tone: frequency (Hz), length (s), loudness (0..1), start delay (s).
function tone(freq, length, loudness, delay = 0) {
  const a = audio();
  if (!a || isMuted()) return;
  try {
    const t = a.currentTime + delay;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(loudness, t + 0.02); // soft attack, no click
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(gain).connect(a.destination);
    osc.start(t);
    osc.stop(t + length + 0.05);
  } catch {
    // sound failed: nothing else depends on it
  }
}

// 3-2-1 before a set: one soft beep per second (n = 3, 2 or 1); the last one a little higher.
export function countBeep(n) {
  tone(n === 1 ? 660 : 520, 0.16, 0.12);
}

// Finish: a short, brighter rising chime.
export function finishChime() {
  tone(660, 0.25, 0.14, 0);
  tone(830, 0.25, 0.14, 0.14);
  tone(990, 0.45, 0.16, 0.28);
}
