// Small round avatar (owner: Habiba). Colors come from the crew data (avatar.skin, hair, accent), never typed here.
export default function Avatar({ avatar, name }) {
  const skin = avatar?.skin ?? 'var(--muted)';
  const scarf = avatar?.accent ?? 'var(--primary)';
  const hijab = avatar?.hair === 'hijab';
  return (
    <svg viewBox="0 0 48 48" width="56" height="56" role="img" aria-label={`Avatar of ${name}`} focusable="false">
      <circle cx="24" cy="24" r="24" fill="var(--raised)" />
      {hijab ? (
        <path d="M24 7c-8 0-13 6-13 14 0 5 2 8 2 8l-3 13h28l-3-13s2-3 2-8c0-8-5-14-13-14z" fill={scarf} />
      ) : (
        <path d="M24 8c-7 0-11 5-11 12h22c0-7-4-12-11-12z" fill="var(--muted)" />
      )}
      <ellipse cx="24" cy="24" rx="8" ry="9.5" fill={skin} />
      <circle cx="21" cy="23" r="1" fill="var(--bg)" />
      <circle cx="27" cy="23" r="1" fill="var(--bg)" />
      <path d="M21.5 28.5c1.5 1.2 3.5 1.2 5 0" stroke="var(--bg)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
