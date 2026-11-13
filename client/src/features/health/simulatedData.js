// SIMULATED demo data (owner: Habiba). Everything in this file is made up for the demonstration and is always shown
// with the label "Simulated demo data". It is NOT NASA data and NOT a real person's measurements.
// Replace these with real sample files in data/ when the team agrees on them.

// Exercise sessions: heart rate before, at the peak, and 2 minutes after. Recovery drop = peak minus 2 minutes after.
export const SIMULATED_EXERCISE = [
  { missionDay: 131, minutes: 60, hrBefore: 66, hrPeak: 152, hrAfter2: 98 },
  { missionDay: 134, minutes: 45, hrBefore: 67, hrPeak: 150, hrAfter2: 100 },
  { missionDay: 136, minutes: 60, hrBefore: 66, hrPeak: 154, hrAfter2: 104 },
  { missionDay: 138, minutes: 45, hrBefore: 68, hrPeak: 151, hrAfter2: 107 },
  { missionDay: 140, minutes: 40, hrBefore: 69, hrPeak: 149, hrAfter2: 109 },
];

// Fluid-shift symptoms, 0 = none, 1 = mild, 2 = moderate, 3 = strong.
export const SIMULATED_SYMPTOMS = [
  { missionDay: 136, levels: { puffiness: 1, fullness: 0, congestion: 0, vision: 0 } },
  { missionDay: 137, levels: { puffiness: 1, fullness: 1, congestion: 0, vision: 0 } },
  { missionDay: 138, levels: { puffiness: 1, fullness: 1, congestion: 1, vision: 0 } },
  { missionDay: 139, levels: { puffiness: 2, fullness: 1, congestion: 1, vision: 0 } },
  { missionDay: 140, levels: { puffiness: 1, fullness: 1, congestion: 1, vision: 0 } },
  { missionDay: 141, levels: { puffiness: 1, fullness: 1, congestion: 0, vision: 0 } },
];
