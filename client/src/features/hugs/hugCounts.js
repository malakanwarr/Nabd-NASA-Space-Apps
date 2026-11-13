const keyOf = (name) =>
  String(name ?? '')
    .trim()
    .split(' ')[0]
    .toLowerCase();

// weeklyCounts(hugs.thisWeek, liveHugs, profile.family) -> [{ name, relation, count }], most hugs first.
export function weeklyCounts(thisWeek = [], liveHugs = [], family = []) {
  const counts = new Map();
  const names = new Map();
  for (const h of [...thisWeek, ...liveHugs]) {
    const k = keyOf(h.from);
    counts.set(k, (counts.get(k) ?? 0) + 1);
    if (!names.has(k)) names.set(k, h.from);
  }

  const rows = family.map((f) => ({
    name: f.name,
    relation: String(f.relation ?? '').toLowerCase(),
    count: counts.get(keyOf(f.name)) ?? 0,
  }));

  // Someone who sent a hug but is not in the family list still gets counted.
  for (const [k, count] of counts) {
    if (!family.some((f) => keyOf(f.name) === k))
      rows.push({ name: names.get(k), relation: '', count });
  }

  return rows.sort((a, b) => b.count - a.count);
}
