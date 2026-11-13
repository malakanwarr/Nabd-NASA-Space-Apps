// DEMO FALLBACK ANSWERS (owner: Hana Haytham).
// Used ONLY when the AI is down (no key, timeout, quota). Copied from prompt.md section 5.
// The app labels these as saved answers, so nobody mistakes them for a live reply.

export function emergencyLine(officer) {
  return `⚠️ Contact the crew medical officer (${officer}) now.`;
}

function emergencyAnswer(officer) {
  return [
    `⚠️ **Contact the crew medical officer (${officer}) now.**`,
    `1. Stop what you're doing and sit or lie down.`,
    `2. Put on the pulse oximeter so your heart rate and oxygen are ready when ${officer.split(' ')[0]} arrives.`,
  ].join('\n');
}

function backAndUrineAnswer(officer) {
  return [
    'Most likely you are **dehydrated**, and it could be an **early kidney stone**: you have had only 1.6 L of water a day, and your father had kidney stones.',
    '1. Drink 500 mL now and aim for 3 L today.',
    "2. Do a urine dipstick test. I'll guide you.",
    '3. Rate your pain from 1 to 10 now and every 2 hours.',
    "4. If you need pain relief, take paracetamol 500 mg–1 g. Avoid ibuprofen until you're drinking well.",
    '',
    `**Get help now** from ${officer.split(' ')[0]} if you get a fever, blood in your urine, vomiting or severe pain.`,
  ].join('\n');
}

function offlineAnswer(officer) {
  return [
    "The AI doctor is not responding right now, so I can't give you a personal answer.",
    `If this is urgent, **contact the crew medical officer (${officer}) now.**`,
    'Otherwise, try again in a minute, or log your symptom so it is ready for the flight surgeon.',
  ].join('\n');
}

/** Picks the saved answer closest to the message. */
export function demoAnswer(message, { redFlag, officer }) {
  const text = message.toLowerCase();
  if (redFlag) return emergencyAnswer(officer);
  if (/back/.test(text) && /(urine|pee|wee)/.test(text)) return backAndUrineAnswer(officer);
  return offlineAnswer(officer);
}
