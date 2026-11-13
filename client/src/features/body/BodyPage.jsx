// Body tab (owner: Hana Haytham). Design: Body.dc.html.
// Astronaut body map colored by status, filter chips, and a card for each of the 8 systems.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ScreenHeader from '../../shared/ScreenHeader.jsx';
import Chip from '../../shared/Chip.jsx';
import StatusLabel from '../../shared/StatusLabel.jsx';
import { getSampleData } from '../../shared/sampleData.js';
import { STATUS_ORDER, systemLink } from './systemInfo.js';
import s from './styles.module.css';

const WORDS = { stable: 'Stable', watch: 'Watch', act: 'Act' };

// Label positions on the body map (from the design). lines = name split over lines.
const LABELS = [
  { id: 'mind', lines: ['Mind and sleep'], x: 0, y: 52, leader: [150, 56, 92, 56] },
  { id: 'eyes', lines: ['Eyes'], x: 270, y: 77, leader: [192, 81, 266, 81] },
  { id: 'radiation', lines: ['Radiation'], x: 270, y: 129, leader: [210, 133, 266, 133] },
  { id: 'heart', lines: ['Heart'], x: 270, y: 166, leader: [203, 158, 266, 158] },
  { id: 'kidneys', lines: ['Kidneys'], x: 0, y: 208, leader: [153, 212, 92, 212] },
  { id: 'cycle', lines: ['Cycle'], x: 270, y: 255, leader: [182, 259, 266, 259] },
  { id: 'bones', lines: ['Bones and', 'muscles'], x: 0, y: 310, leader: [155, 314, 92, 314] },
];

function BodyMap({ statusOf, filter }) {
  // Organ class: status color, a soft pulse when not stable, faded when filtered out.
  const organ = (id) => {
    const st = statusOf[id] || 'stable';
    const hidden = filter === 'attention' ? st === 'stable' : filter === 'stable' ? st !== 'stable' : false;
    return `${s[`fill_${st}`]} ${st !== 'stable' ? s.pulse : ''} ${hidden ? s.dim : ''}`;
  };
  const stroke = (id) => {
    const st = statusOf[id] || 'stable';
    const hidden = filter === 'attention' ? st === 'stable' : filter === 'stable' ? st !== 'stable' : false;
    return `${s[`stroke_${st}`]} ${st !== 'stable' ? s.pulse : ''} ${hidden ? s.dim : ''}`;
  };

  const groups = { watch: [], act: [], stable: [] };
  LABELS.forEach((l) => groups[statusOf[l.id] || 'stable'].push(l.lines.join(' ').toLowerCase()));
  const description =
    'Astronaut body map. ' +
    ['act', 'watch', 'stable']
      .filter((k) => groups[k].length)
      .map((k) => `${WORDS[k]}: ${groups[k].join(', ')}.`)
      .join(' ');

  return (
    <svg className={s.map} viewBox="0 0 358 400" role="img" aria-label={description}>
      <g className={s.float}>
        <g transform="translate(69 0)">
          {/* Suit */}
          <rect x="50" y="118" width="120" height="112" rx="10" className={s.suitBack} />
          <path d="M60 126 L32 210 L46 218 L74 152 Z" className={s.suit} />
          <path d="M160 126 L188 210 L174 218 L146 152 Z" className={s.suit} />
          <circle cx="38" cy="222" r="10" className={s.suitDark} />
          <circle cx="182" cy="222" r="10" className={s.suitDark} />
          <path d="M58 244 L106 250 L102 374 L70 374 Z" className={s.suit} />
          <path d="M114 250 L162 244 L150 374 L118 374 Z" className={s.suit} />
          <rect x="64" y="372" width="44" height="18" rx="6" className={s.suitDark} />
          <rect x="112" y="372" width="44" height="18" rx="6" className={s.suitDark} />
          <path d="M60 122 Q110 108 160 122 L168 238 Q110 252 52 238 Z" className={s.suit} />
          <circle cx="70" cy="140" r="6" className={s.patch} />
          {/* Lungs */}
          <path d="M80 132 C70 150 70 180 80 196 C92 196 100 188 102 176 L102 140 C96 132 86 128 80 132 Z" className={s.lung} />
          <path d="M140 132 C150 150 150 180 140 196 C128 196 120 188 118 176 L118 140 C124 132 134 128 140 132 Z" className={s.lung} />
          {/* Heart */}
          <path d="M118 150 C112 146 116 136 122 138" className={`${s.vessel} ${stroke('heart')}`} />
          <path
            d="M110 152 C110 144 120 142 124 148 C128 142 138 144 136 154 C134 164 122 172 118 176 C112 170 102 162 110 152 Z"
            className={`${s.heart} ${organ('heart')}`}
          />
          {/* Radiation dosimeter */}
          <rect x="134" y="126" width="10" height="14" rx="2" className={`${s.badge} ${organ('radiation')}`} />
          {/* Kidneys */}
          <ellipse cx="92" cy="212" rx="8" ry="12" transform="rotate(-15 92 212)" className={organ('kidneys')} />
          <ellipse cx="128" cy="212" rx="8" ry="12" transform="rotate(15 128 212)" className={organ('kidneys')} />
          {/* Belt */}
          <rect x="54" y="232" width="112" height="12" rx="3" className={s.suitDark} />
          {/* Pelvis and leg bones */}
          <path
            d="M80 250 C72 258 76 274 92 274 C100 268 104 262 110 262 C116 262 120 268 128 274 C144 274 148 258 140 250 C128 256 92 256 80 250 Z"
            className={organ('bones')}
          />
          {/* Cycle and reproductive */}
          <path d="M104 254 L116 254 L113 264 L107 264 Z" className={`${s.badge} ${organ('cycle')}`} />
          <path d="M104 255 C99 252 97 256 95 258 M116 255 C121 252 123 256 125 258" className={`${s.tube} ${stroke('cycle')}`} />
          <path d="M88 278 L86 350" className={`${s.bone} ${stroke('bones')}`} />
          <path d="M132 278 L134 350" className={`${s.bone} ${stroke('bones')}`} />
          {/* Helmet */}
          <rect x="92" y="104" width="36" height="12" rx="4" className={s.suitDark} />
          <circle cx="110" cy="62" r="46" className={s.helmet} />
          <ellipse cx="110" cy="66" rx="34" ry="30" className={s.visor} />
          {/* Brain */}
          <path d="M88 60 C86 46 98 38 110 40 C122 36 134 44 133 56 C138 62 132 72 124 72 L96 72 C88 72 84 66 88 60 Z" className={organ('mind')} />
          <path d="M98 50 C102 54 106 48 110 52 C114 56 118 48 122 52 M96 62 C102 58 108 66 114 60 C118 58 124 64 128 60" className={s.folds} />
          {/* Eyes */}
          <ellipse cx="101" cy="81" rx="4" ry="2.5" className={organ('eyes')} />
          <ellipse cx="119" cy="81" rx="4" ry="2.5" className={organ('eyes')} />
          <path d="M86 44 C92 34 104 30 114 31" className={s.shine} />
        </g>

        {/* Leader lines and labels */}
        <g className={s.leader}>
          {LABELS.map((l) => (
            <line key={l.id} x1={l.leader[0]} y1={l.leader[1]} x2={l.leader[2]} y2={l.leader[3]} />
          ))}
        </g>
        <g className={s.labels}>
          {LABELS.map((l) => {
            const st = statusOf[l.id] || 'stable';
            return (
              <g key={l.id}>
                {l.lines.map((line, i) => (
                  <text key={i} x={l.x} y={l.y + i * 15} className={s.labelName}>
                    {line}
                  </text>
                ))}
                <text x={l.x} y={l.y + l.lines.length * 15} className={s[`text_${st}`]}>
                  {WORDS[st]}
                </text>
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}

function cardText(x) {
  if (x.riskScore == null) return x.headline;
  return `Risk ${x.riskScore} · ${x.headline.charAt(0).toLowerCase()}${x.headline.slice(1)}`;
}

export default function BodyPage() {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [filter, setFilter] = useState('all'); // all | attention | stable

  function fetchSystems() {
    getSampleData('body-systems')
      .then((d) => {
        setData(d);
        setState('ready');
      })
      .catch(() => setState('error'));
  }

  function retry() {
    setState('loading');
    fetchSystems();
  }

  useEffect(fetchSystems, []);

  const header = <ScreenHeader eyebrow="Compared with your baseline" title="Body systems" />;

  if (state === 'loading') {
    return (
      <main className={s.page}>
        {header}
        <p className={s.muted} role="status">
          Loading your body systems…
        </p>
      </main>
    );
  }

  if (state === 'error') {
    return (
      <main className={s.page}>
        {header}
        <p className={s.errorText} role="alert">
          Your body systems can't load right now.
        </p>
        <button type="button" className={s.secondaryBtn} onClick={retry}>
          Try again
        </button>
      </main>
    );
  }

  const systems = [...(data?.systems || [])].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  if (systems.length === 0) {
    return (
      <main className={s.page}>
        {header}
        <p className={s.muted}>No body systems to show yet. They appear after your first measurements.</p>
      </main>
    );
  }

  const statusOf = Object.fromEntries(systems.map((x) => [x.id, x.status]));
  const attention = systems.filter((x) => x.status !== 'stable');
  const stable = systems.filter((x) => x.status === 'stable');
  const shown = filter === 'attention' ? attention : filter === 'stable' ? stable : systems;

  return (
    <main className={s.page}>
      {header}

      <div className={s.chips} role="group" aria-label="Filter">
        <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
          All {systems.length}
        </Chip>
        <Chip selected={filter === 'attention'} onClick={() => setFilter('attention')}>
          Needs attention {attention.length}
        </Chip>
        <Chip selected={filter === 'stable'} onClick={() => setFilter('stable')}>
          Stable {stable.length}
        </Chip>
      </div>

      <BodyMap statusOf={statusOf} filter={filter} />

      <h2 className={s.h2}>{filter === 'attention' ? 'Needs attention' : filter === 'stable' ? 'Stable systems' : 'All systems'}</h2>
      {shown.length === 0 ? (
        <p className={s.muted}>{filter === 'attention' ? 'Nothing needs attention right now.' : 'No systems here right now.'}</p>
      ) : (
        <div className={s.grid}>
          {shown.map((x) => (
            <Link key={x.id} to={systemLink(x.id)} className={s.card}>
              <span className={s.cardStatus}>
                <StatusLabel status={x.status} />
                {x.id === 'cycle' && <span className={s.private}>· private</span>}
              </span>
              <span className={s.cardName}>{x.name}</span>
              <span className={s.cardText}>{cardText(x)}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
