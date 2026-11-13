// Heart rate response to a workout, recorded by itself (owner: Habiba). Called when a workout finishes.
//
// In the product a wearable heart sensor streams the heart rate all day, so NABD knows it before the workout, at the
// peak and 2 minutes after. This prototype has no live sensor, so the three numbers are worked out here from the
// astronaut's resting heart rate, how long she worked out and how hard the workout was. Replace this one function with
// the real sensor stream. Nothing is typed in by the astronaut.
import { getSampleData } from '../../shared/sampleData.js';
import { clamp } from './healthModel.js';
import { saveEntry } from './storage.js';

// How hard each workout level is (the workout page calls them full, lighter and light).
const INTENSITY = { full: 1, lighter: 0.75, light: 0.55 };

export async function recordWorkoutHeart({ crewId, seconds, level }) {
  if (!crewId || !(seconds >= 30)) return null; // too short to say anything
  try {
    const today = await getSampleData('today');
    const resting = today.vitals.heartRateBpm;
    const minutes = Math.max(1, Math.round(seconds / 60));
    const jitter = (Math.round(seconds) % 7) - 3; // small, repeatable difference between sessions
    const lift = Math.round(88 * (INTENSITY[level] ?? 0.75) * clamp(minutes / 20, 0.5, 1));
    const hrBefore = resting;
    const hrPeak = resting + lift + jitter;
    const hrAfter2 = hrPeak - Math.round((hrPeak - hrBefore) * 0.5) - jitter;
    const entry = { missionDay: today.missionDay, date: today.date, at: Date.now(), minutes, hrBefore, hrPeak, hrAfter2, source: 'sensor' };
    saveEntry('exercise', crewId, entry);
    return entry;
  } catch {
    return null; // no sensor numbers this time; the workout itself is already saved
  }
}
