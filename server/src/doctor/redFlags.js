// Checks a message for emergency words BEFORE calling the AI (owner: Hana Haytham).
// If this returns a match, the app shows the red banner straight away, even if the AI is slow or down.
// It errs on the side of caution: a false alarm costs one tap, a missed emergency costs much more.
// The list follows "RED FLAGS" in prompt.md. Keep the two in sync.

const RULES = [
  { reason: 'Chest pain', words: [/chest (pain|pressure|tight)/, /tight(ness)? (in|on) (my )?chest/, /pain in (my )?chest/] },
  { reason: 'Fainting', words: [/faint/, /pass(ed)? out/, /black(ed)? out/, /lost consciousness/] },
  { reason: 'Heartbeat', words: [/heart (is )?(racing|pounding|skipping)/, /irregular (heart|pulse)/, /palpitation/] },
  {
    reason: 'Breathing',
    words: [/can'?t breathe/, /cannot breathe/, /(trouble|difficulty|hard) breathing/, /short(ness)? of breath/, /can'?t catch my breath/, /choking/],
  },
  {
    reason: 'Stroke signs',
    words: [/worst headache/, /sudden (severe |bad )?headache/, /(weak|numb)(ness)? (on|in) one side/, /one side of my (face|body)/, /face (is )?droop/, /slurr/, /(trouble|can'?t) (speaking|talk)/, /(feel|feeling|felt) confused/, /confusion/],
  },
  { reason: 'Vision change', words: [/vision (change|loss)/, /(lost|losing) (my )?(vision|sight)/, /blurr?(y|ed) vision/, /double vision/, /can'?t see/] },
  { reason: 'Fever', words: [/stiff neck/] },
  {
    reason: 'Bleeding',
    words: [/vomit(ing|ed)? blood/, /blood in (my )?(stool|poo|vomit|urine|pee)/, /heavy bleeding/, /soak(ing|ed) (a|my|through)/, /bleeding (a lot|heavily|won'?t stop)/],
  },
  { reason: 'Severe pain', words: [/severe (tummy|stomach|belly|abdominal|pelvic) pain/, /(worst|unbearable|excruciating) pain/] },
  { reason: 'Possible blood clot', words: [/(swollen|swelling|red|painful) (in )?(one )?(leg|calf|arm)/, /(leg|calf|arm) (is )?(swollen|swelling)/] },
  {
    reason: 'Mental health crisis',
    words: [/kill myself/, /suicid/, /(harm|hurt) myself/, /self.?harm/, /end (my life|it all)/, /(don'?t|do not) want to (live|be alive|be here)/, /can'?t cope/, /better off dead/],
  },
  { reason: 'Head or eye injury', words: [/(hit|bang(ed)?|bumped|injur(ed|y)) (to )?(my )?(head|eye)/, /head injury/, /eye injury/, /something in my eye/] },
];

// Numbers she might type: "oxygen 89", "spo2 is 90%", "fever 39", "temperature 38.9".
function numberAfter(text, pattern) {
  const m = text.match(pattern);
  return m ? parseFloat(m[1]) : null;
}

/**
 * @param {string} message what the astronaut typed
 * @returns {{ reason: string } | null} the first emergency found, or null
 */
export function checkRedFlags(message) {
  if (typeof message !== 'string' || !message.trim()) return null;
  // Lower case and straight apostrophes, so "Can’t" and "can't" match the same rule.
  const text = message.toLowerCase().replace(/[‘’]/g, "'");

  for (const rule of RULES) {
    if (rule.words.some((re) => re.test(text))) return { reason: rule.reason };
  }

  const spo2 = numberAfter(text, /(?:oxygen|spo2|sats?)\D{0,12}(\d{2,3})/);
  if (spo2 !== null && spo2 < 92) return { reason: 'Low oxygen' };

  const temp = numberAfter(text, /(?:fever|temp(?:erature)?)\D{0,12}(\d{2}(?:\.\d)?)/);
  if (temp !== null && temp > 38.5 && temp < 45) return { reason: 'High fever' };

  return null;
}
