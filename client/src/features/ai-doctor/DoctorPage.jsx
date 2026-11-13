// AI doctor chat (owner: Hana Haytham). Layout follows Doctor.dc.html in the design canvas.
// Sends her question to POST /api/doctor/chat. The server checks for emergencies first,
// then asks the AI with her data, and falls back to a saved answer if the AI is down.
// Under each answer it lists the NASA pages the answer cites ([1], [2]...), linked to nasa.gov.
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Chip from '../../shared/Chip.jsx';
import { apiFetch } from '../../shared/api.js';
import { getSampleData } from '../../shared/sampleData.js';
import { useSession } from '../../shared/session.js';
import EarthSummary from './EarthSummary.jsx';
import s from './styles.module.css';

// Short chip label -> the message that is sent.
const SUGGESTIONS = [
  { label: "I can't sleep", text: "I can't sleep, I keep waking up at 3 am." },
  { label: 'Headache since this morning', text: "I've had a headache since the solar storm alert this morning." },
  { label: 'Period cramps', text: 'Bad period cramps today, worse than usual.' },
  { label: 'Back ache and dark urine', text: 'Dull ache in my lower right back since this morning, and my urine looks darker.' },
];

const MAX_LENGTH = 1000;

function PhoneIcon() {
  return (
    <svg className={s.icon16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg className={s.warnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 3 2 20h20z" />
      <path d="M12 10v4M12 17v.5" />
    </svg>
  );
}

// Turns "**bold**" into <strong> and "*italic*" into <em>, without using HTML strings.
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

// A danger line: "Get help now…", or the emergency line that starts with ⚠️.
function isDangerLine(line) {
  return /^⚠️/.test(line) || /^(\*\*)?get help now/i.test(line);
}

// Paragraphs, numbered steps as a list, and danger lines in red with a warning icon.
function FormattedReply({ text }) {
  const blocks = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const step = line.match(/^\d+[.)]\s+(.*)/);
    const last = blocks[blocks.length - 1];
    if (step) {
      if (last && last.type === 'list') last.items.push(step[1]);
      else blocks.push({ type: 'list', items: [step[1]] });
    } else if (isDangerLine(line)) {
      blocks.push({ type: 'danger', text: line.replace(/^⚠️\s*/, '') });
    } else {
      blocks.push({ type: 'p', text: line });
    }
  }
  return blocks.map((b, i) => {
    if (b.type === 'list') {
      return (
        <ol key={i} className={s.steps}>
          {b.items.map((item, j) => (
            <li key={j}>{inline(item)}</li>
          ))}
        </ol>
      );
    }
    if (b.type === 'danger') {
      return (
        <p key={i} className={s.danger}>
          <WarnIcon />
          <span>{inline(b.text)}</span>
        </p>
      );
    }
    return (
      <p key={i} className={s.para}>
        {inline(b.text)}
      </p>
    );
  });
}

// The NASA pages this answer cites, numbered like the [1] markers in the text.
function NasaSources({ sources }) {
  return (
    <div className={s.sources}>
      <p className={s.muted}>From NASA research</p>
      <ul className={s.sourceList}>
        {sources.map((src) => (
          <li key={src.url}>
            <a className={s.sourceLink} href={src.url} target="_blank" rel="noreferrer">
              [{src.n.join(', ')}] {src.title}
              <span className={s.srOnly}> (opens nasa.gov in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// Voice input with the browser's own speech recognition (Chrome, Edge, Safari). Hidden if not supported.
const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

export default function DoctorPage() {
  const session = useSession();
  const [params] = useSearchParams();
  const [mission, setMission] = useState(null);
  const [missionState, setMissionState] = useState('loading'); // loading | ready | error
  const [messages, setMessages] = useState([]); // { role: 'user' | 'doctor', text, source?, redFlag?, sources? }
  const [draft, setDraft] = useState(() => (params.get('ask') || '').slice(0, MAX_LENGTH));
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null); // { message, text } so "Try again" can resend
  const [emergency, setEmergency] = useState(null); // reason text once a red flag is found
  const [paged, setPaged] = useState(false);
  const [listening, setListening] = useState(false);
  const endRef = useRef(null);
  const recognitionRef = useRef(null);

  function fetchMission() {
    getSampleData('mission')
      .then((data) => {
        setMission(data);
        setMissionState('ready');
      })
      .catch(() => setMissionState('error'));
  }

  function retryMission() {
    setMissionState('loading');
    fetchMission();
  }

  useEffect(fetchMission, []);
  useEffect(() => () => recognitionRef.current?.abort(), []);

  // Keep the newest message in view.
  useEffect(() => {
    if (messages.length || sending || sendError) {
      endRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'end' });
    }
  }, [messages, sending, sendError]);

  const officer = mission?.crewMedicalOfficer || 'the crew medical officer';
  const officerFirst = mission?.crewMedicalOfficer?.split(' ')[0] || 'medic';

  async function send(text) {
    const question = text.trim();
    if (!question || sending) return;
    const history = messages.map(({ role, text: t }) => ({ role, text: t }));
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setDraft('');
    setSendError(null);
    setSending(true);
    try {
      const data = await apiFetch('/api/doctor/chat', {
        method: 'POST',
        body: { message: question, history, crewId: session?.id },
      });
      if (data.redFlag) setEmergency(data.redFlagReason || 'Danger sign');
      setMessages((m) => [
        ...m,
        { role: 'doctor', text: data.reply, source: data.source, redFlag: data.redFlag, sources: Array.isArray(data.sources) ? data.sources : [] },
      ]);
    } catch (err) {
      // Take her question back out so "Try again" doesn't show it twice.
      setMessages((m) => m.slice(0, -1));
      setSendError({ message: err.message, text: question });
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    send(draft);
  }

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onresult = (e) => setDraft((d) => `${d ? d + ' ' : ''}${e.results[0][0].transcript}`.slice(0, MAX_LENGTH));
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  const header = (
    <header className={s.header}>
      <div className={s.headText}>
        <h1 className={s.title}>AI doctor</h1>
        <span className={s.sub}>
          <span className={s.liveDot} aria-hidden="true" />
          Runs on the ship · works without Earth
        </span>
      </div>
      <button type="button" className={s.callBtn} onClick={() => setPaged(true)} disabled={missionState !== 'ready'}>
        <PhoneIcon />
        Call {officerFirst}
      </button>
    </header>
  );

  if (missionState === 'loading') {
    return (
      <main className={s.page}>
        {header}
        <p className={s.muted} role="status">
          Loading the AI doctor…
        </p>
      </main>
    );
  }

  if (missionState === 'error') {
    return (
      <main className={s.page}>
        {header}
        <p className={s.errorText} role="alert">
          The AI doctor can't load right now. If you feel unwell, contact the crew medical officer now.
        </p>
        <button type="button" className={s.secondaryBtn} onClick={retryMission}>
          Try again
        </button>
      </main>
    );
  }

  const doctorReplies = messages.filter((m) => m.role === 'doctor').length;

  return (
    <main className={`${s.page} ${s.withComposer}`}>
      {header}

      {paged && (
        <p className={s.paged} role="status">
          <strong>{officer} has been paged.</strong> Stay where you are.
        </p>
      )}

      {emergency && (
        <section className={s.banner} role="alert" aria-label="Emergency">
          <p className={s.danger}>
            <WarnIcon />
            <span>Emergency: {emergency.toLowerCase()}</span>
          </p>
          <p className={s.para}>Stop what you are doing. Contact {officer}, the crew medical officer, now.</p>
          {!paged && (
            <button type="button" className={s.callBtn} onClick={() => setPaged(true)}>
              <PhoneIcon />
              Call {officerFirst} now
            </button>
          )}
        </section>
      )}

      <section className={s.chat} aria-label="Conversation" aria-live="polite">
        {messages.length === 0 && !sending && (
          <div className={s.empty}>
            <p className={s.emptyTitle}>How are you feeling, {session?.name?.split(' ')[0] || 'today'}?</p>
            <p className={s.muted}>
              Describe a symptom or pick one below. I answer with your own data and the ship's medical kit. Earth is{' '}
              {mission?.earthDelayOneWay?.text || 'far'} away, so I help until the flight surgeon replies.
            </p>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === 'user' ? (
            <p key={i} className={s.userMsg}>
              {m.text}
            </p>
          ) : (
            <div key={i} className={s.doctorMsg}>
              <span className={s.srOnly}>AI doctor:</span>
              <FormattedReply text={m.text} />
              {m.source === 'demo' && <p className={s.note}>Saved answer, AI offline</p>}
              {m.sources?.length > 0 && <NasaSources sources={m.sources} />}
            </div>
          ),
        )}

        {sending && (
          <p className={s.thinking} role="status">
            <span className={s.dots} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            AI doctor is thinking…
          </p>
        )}

        {sendError && (
          <div className={s.sendError} role="alert">
            <p className={s.errorText}>{sendError.message}</p>
            <button type="button" className={s.secondaryBtn} onClick={() => send(sendError.text)}>
              Try again
            </button>
          </div>
        )}

        {doctorReplies > 0 && <span className={s.small}>Not a diagnosis · based on your own data and the ship's medical kit</span>}
        <div ref={endRef} />
      </section>

      {doctorReplies > 0 && <EarthSummary mission={mission} />}

      <div className={s.composer}>
        <div className={s.chips}>
          {SUGGESTIONS.map((q) => (
            <Chip key={q.label} onClick={() => send(q.text)}>
              {q.label}
            </Chip>
          ))}
        </div>
        <form className={s.inputRow} onSubmit={onSubmit}>
          <input
            className={s.input}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="Describe how you feel"
            aria-label="Describe how you feel"
            disabled={sending}
          />
          {SpeechRecognition && (
            <button
              type="button"
              className={`${s.iconBtn} ${listening ? s.listening : ''}`}
              onClick={toggleVoice}
              aria-label={listening ? 'Stop listening' : 'Speak instead'}
              aria-pressed={listening}
              disabled={sending}
            >
              <svg className={s.icon20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <rect x="9" y="3" width="6" height="12" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </button>
          )}
          <button type="submit" className={s.sendBtn} aria-label="Send" disabled={sending || !draft.trim()}>
            <svg className={s.icon20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
      </div>
    </main>
  );
}