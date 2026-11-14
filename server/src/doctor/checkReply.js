// Checks on the AI's answer before it goes to the app (owner: Hana Haytham).
//
// trimOffTopicWarnings(reply, question, { redFlag })
//   The prompt asks for a "Get help now if…" line that matches her problem, but the model sometimes
//   adds mental-health signs ("unable to cope", "thoughts of harming yourself") to a plain sleep or
//   headache question. That is alarming and off-topic, so this removes those items from the
//   "Get help now" line ONLY when her message has no mood words.
//   It never changes: emergency answers, questions where she mentions mood / stress / self-harm,
//   or anything outside the "Get help now" line.

// If her message mentions any of these, mental-health warnings are on-topic and are kept.
const MOOD_WORDS =
  /\b(mood|sad|depress\w*|hopeless\w*|anxious|anxiety|panic\w*|stress\w*|worr\w*|lonel\w*|isolat\w*|cope|coping|harm\w*|hurt myself|suicid\w*|kill myself|want to die|don'?t want to (live|be here)|overwhelm\w*|cry\w*|scared|afraid)\b/i;

// Items in the "Get help now" line that are mental-health signs.
const MENTAL_HEALTH_SIGNS =
  /(self-?harm|harm(ing)? (yourself|herself)|hurt(ing)? (yourself|herself)|suicid|unable to cope|can'?t cope|cannot cope|not able to cope|hopeless|low mood|depress|want to die|not wanting to live|thoughts of (ending|harming))/i;

const NEUTRAL_ENDING = 'it gets much worse or you feel very unwell';

// Splits "a, b, or c" into ["a", "b", "c"].
function splitItems(list) {
  return list
    .split(/,\s*(?:or\s+|and\s+)?|\s+or\s+/i)
    .map((x) => x.trim())
    .filter(Boolean);
}

// Joins ["a", "b", "c"] back into "a, b or c".
function joinItems(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}

// "Get help now if X, Y or Z."  (also "**Get help now** if …", with or without a final full stop)
const HELP_LINE = /^(\s*(?:\*\*)?get help now(?:\*\*)?[^\n]*?\bif\b\s*)(.+?)(\s*[.!]?\s*(?:\*\*)?\s*)$/i;

export function trimOffTopicWarnings(reply, question, { redFlag } = {}) {
  if (typeof reply !== 'string' || !reply) return reply;
  if (redFlag) return reply; // emergency answers are never changed
  if (MOOD_WORDS.test(question || '')) return reply; // she mentioned mood: the warning is on-topic

  const lines = reply.split('\n');
  let changed = false;

  const out = lines.map((line) => {
    if (line.includes('⚠️')) return line;
    const m = line.match(HELP_LINE);
    if (!m) return line;
    const [, start, list, end] = m;
    const items = splitItems(list);
    const kept = items.filter((item) => !MENTAL_HEALTH_SIGNS.test(item));
    if (kept.length === items.length) return line;

    changed = true;
    if (kept.length === 0) return `${start}${NEUTRAL_ENDING}.`;
    // Keep the sentence readable if the item we removed was the one that started with "you …".
    if (/^you\b/i.test(items[0]) && !/^(you|your|it|there|the|a|an)\b/i.test(kept[0])) kept[0] = `you ${kept[0]}`;
    return `${start}${joinItems(kept)}${end.trim() ? end : '.'}`;
  });

  if (changed) console.log('[doctor] removed off-topic mental-health signs from the "Get help now" line');
  return out.join('\n');
}
