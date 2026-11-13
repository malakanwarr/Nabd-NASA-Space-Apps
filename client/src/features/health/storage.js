// Entries the astronaut records herself (owner: Habiba). Kept on this phone, per crew member, so every
// module works offline and her symptoms stay private. kind: 'sleep' | 'bp' | 'exercise' | 'symptoms'.
const key = (kind, crewId) => `nabd-health-${kind}-${crewId}`;

export function readEntries(kind, crewId) {
  try {
    const list = JSON.parse(localStorage.getItem(key(kind, crewId)) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// replaceBy: a field name. An existing entry with the same value in that field is replaced (one sleep entry a day).
export function saveEntry(kind, crewId, entry, replaceBy) {
  const list = readEntries(kind, crewId);
  const at = replaceBy ? list.findIndex((e) => e[replaceBy] === entry[replaceBy]) : -1;
  if (at >= 0) list[at] = entry;
  else list.push(entry);
  try {
    localStorage.setItem(key(kind, crewId), JSON.stringify(list));
  } catch {
    // storage blocked or full: the entry still shows until the page is left
  }
  return list;
}
