import s from './styles.module.css';

function initialsOf(member) {
  if (member.initials) return member.initials;
  return String(member.name || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// Avatar colours come from the sample data (inline style is allowed for those hex values).
export function Avatar({ member, className = '' }) {
  const a = member.avatar;
  if (!a || typeof a !== 'object') {
    return (
      <span className={`${s.avatar} ${s.initials} ${className}`} aria-hidden="true">
        {initialsOf(member)}
      </span>
    );
  }
  return (
    <span className={`${s.avatar} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 48 48" className={s.avatarSvg}>
        <rect width="48" height="48" fill={a.accent || a.suit} opacity="0.25" />
        <path d="M6 48c0-10 8-16 18-16s18 6 18 16z" fill={a.suit} />
        <circle cx="24" cy="21" r="9" fill={a.skin} />
        <path
          d="M14.5 20c0-6 4-10 9.5-10s9.5 4 9.5 10c-2-3-5-5-9.5-5s-7.5 2-9.5 5z"
          fill={a.hairColor || a.hair}
        />
      </svg>
    </span>
  );
}

export default function CrewTile({ member, onPick }) {
  return (
    <button
      type="button"
      className={s.tile}
      aria-label={`${member.name}, ${member.role}`}
      onClick={() => onPick(member)}
    >
      <Avatar member={member} />
      <span className={s.tileName}>{member.name}</span>
      <span className={s.tileRole}>{member.role}</span>
    </button>
  );
}
