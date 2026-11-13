// AI doctor chat (owner: Hana Haytham). Layout follows Doctor.dc.html in the design canvas.
// Sends her question to POST /api/doctor/chat. The server checks for emergencies first,
// then asks the AI with her data, and falls back to a saved answer if the AI is down.
// Under each answer it lists the NASA pages the answer cites ([1], [2]...), linked to nasa.gov,
// and a "Send to Earth" button so she chooses which answers go to the flight surgeon (EarthSummary.jsx).
// The chat always opens clean. Her earlier chat is still loaded from the server (GET /api/doctor/history/:crewId)
// but only shown when she taps "History", so a reload loses nothing and nothing she sent to Earth is lost.
// Answers still travelling to the flight surgeon show as one "on its way" line on the clean chat.
import { Fragment, useEffect, useRef, useState } from 'react';
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

// The steps the server goes through for each question (doctor.js), shown while she waits.
const THINKING_STEPS = ['Checking your data…', 'Searching NASA research…', 'Writing an answer…'];

// "Today" for messages from today (or not saved yet), "Earlier" for anything before.
function dayGroup(value) {
  if (!value) return 'Today';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Today';
  return d.toDateString() === new Date().toDateString() ? 'Today' : 'Earlier';
}

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

// Small numbered badges for citations, matching the NASA source list under the answer.
function Cites({ nums }) {
  return (
    <span className={s.cites}>
      {nums.map((n) => (
        <span key={n} className={s.cite}>
          <span className={s.srOnly}>source </span>
          {n}
        </span>
      ))}
    </span>
  );
}

// Turns "**bold**" into <strong>, "*italic*" into <em> and "[1]" / "[1, 2]" into source badges,
// without using HTML strings.
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\s?\[\d+(?:\s*,\s*\d+)*\])/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{inline(part.slice(2, -2))}</strong>;
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    const cite = part.match(/^\s?\[(\d+(?:\s*,\s*\d+)*)\]$/);
    if (cite) return <Cites key={i} nums={cite[1].split(',').map((n) => n.trim())} />;
    return part;
  });
}

function clock(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Small round doctor mark on each answer and on the "thinking" bubble.
function DoctorMark() {
  return (
    <span className={s.mark} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M12 6v12M6 12h12" />
      </svg>
    </span>
  );
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
      <p className={s.sourcesLabel}>From NASA research</p>
      <ul className={s.sourceList}>
        {sources.map((src) => (
          <li key={src.url}>
            <a className={s.sourceLink} href={src.url} target="_blank" rel="noreferrer">
              <Cites nums={src.n} />
              <span className={s.sourceTitle}>{src.title}</span>
              <svg className={s.extIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
              </svg>
              <span className={s.srOnly}> (opens nasa.gov in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Turns saved answers from GET /api/doctor/history into chat messages (a question bubble + an answer bubble).
function toMessages(saved) {
  return saved.flatMap((m) => [
    { role: 'user', text: m.question, createdAt: m.createdAt },
    {
      role: 'doctor',
      id: m.id,
      question: m.question,
      text: m.reply,
      source: m.source,
      redFlag: m.redFlag,
      redFlagReason: m.redFlagReason,
      sources: Array.isArray(m.sources) ? m.sources : [],
      sentToEarth: m.sentToEarth || null,
      createdAt: m.createdAt,
    },
  ]);
}

// The bubbles, with "Earlier" / "Today" dividers. Used by the chat and by the history view,
// so an old answer looks and behaves the same (sources, Send to Earth, progress line).
function Conversation({ messages, mission, crewId }) {
  return messages.map((m, i) => {
    const group = dayGroup(m.createdAt);
    const divider = i === 0 || dayGroup(messages[i - 1].createdAt) !== group;
    const key = m.role === 'user' ? (messages[i + 1]?.id ? `q-${messages[i + 1].id}` : `q-${i}`) : m.id || `a-${i}`;
    return (
      <Fragment key={key}>
        {divider && (
          <p className={s.divider}>
            <span>{group}</span>
          </p>
        )}
        {m.role === 'user' ? (
          <p className={s.userMsg}>{m.text}</p>
        ) : (
          <div className={s.doctorMsg}>
            <p className={s.who}>
              <DoctorMark />
              <span className={s.whoName}>AI doctor</span>
              {clock(m.createdAt) && <span className={s.time}>{clock(m.createdAt)}</span>}
            </p>
            <FormattedReply text={m.text} />
            {m.source === 'demo' && <p className={s.note}>Saved answer, AI offline</p>}
            {m.sources?.length > 0 && <NasaSources sources={m.sources} />}
            <EarthSummary mission={mission} crewId={crewId} exchange={m} />
          </div>
        )}
      </Fragment>
    );
  });
}

function ClockIcon() {
  return (
    <svg className={s.icon16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
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
  // This visit's chat only: the page always opens clean.
  const [messages, setMessages] = useState([]); // { role: 'user' | 'doctor', text, id?, question?, source?, redFlag?, redFlagReason?, sources?, sentToEarth? }
  // Her saved chat from the server, shown only when she taps "History".
  const [past, setPast] = useState([]);
  const [pastState, setPastState] = useState(() => (session?.id ? 'loading' : 'ready')); // loading | ready | error
  const [pastLoadedAt, setPastLoadedAt] = useState(0);
  const [view, setView] = useState('chat'); // chat | history
  const [draft, setDraft] = useState(() => (params.get('ask') || '').slice(0, MAX_LENGTH));
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null); // { message, text } so "Try again" can resend
  const [emergency, setEmergency] = useState(null); // reason text once a red flag is found
  const [paged, setPaged] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinkStep, setThinkStep] = useState(0); // which THINKING_STEPS label shows while waiting

  // While waiting, step through what the server is really doing; stay on the last step until the answer comes.
  useEffect(() => {
    if (!sending) return undefined;
    const timer = setInterval(() => setThinkStep((n) => Math.min(n + 1, THINKING_STEPS.length - 1)), 1800);
    return () => clearInterval(timer);
  }, [sending]);
  const endRef = useRef(null);
  const scrolledOnce = useRef(false);
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

  // Her saved chat, oldest first (same GET /api/doctor/history as before). It is kept aside for the
  // History view and for the "on its way to Earth" line; it is never put back into the chat.
  const crewId = session?.id;
  function fetchPast(isCancelled = () => false) {
    if (!crewId) return;
    apiFetch(`/api/doctor/history/${encodeURIComponent(crewId)}?limit=50`)
      .then((data) => {
        if (isCancelled()) return;
        setPast(toMessages(Array.isArray(data?.messages) ? data.messages : []));
        setPastLoadedAt(Date.now());
        setPastState('ready');
      })
      .catch(() => {
        if (!isCancelled()) setPastState('error');
      });
  }

  useEffect(() => {
    let cancelled = false;
    fetchPast(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewId]);

  // Opening History reloads it, so answers from this visit and new "sent" states are included.
  function openHistory() {
    if (pastState !== 'ready' || past.length === 0) setPastState('loading');
    scrolledOnce.current = false;
    setView('history');
    fetchPast();
  }

  function backToChat() {
    scrolledOnce.current = false;
    setView('chat');
  }
  useEffect(() => () => recognitionRef.current?.abort(), []);

  // Keep the newest message in view.
  useEffect(() => {
    const shown = view === 'history' ? past : messages;
    if (shown.length || sending || sendError) {
      // Jump straight to the latest message the first time; glide after that.
      // Scroll to the very bottom of the page, so the room kept for the input bar is included
      // and the last answer sits fully above the bar.
      const smooth = scrolledOnce.current && !prefersReducedMotion();
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
      scrolledOnce.current = true;
    }
  }, [messages, past, view, sending, sendError]);

  const officer = mission?.crewMedicalOfficer || 'the crew medical officer';
  const officerFirst = mission?.crewMedicalOfficer?.split(' ')[0] || 'medic';

  async function send(text) {
    const question = text.trim();
    if (!question || sending) return;
    const history = messages.map(({ role, text: t }) => ({ role, text: t }));
    setMessages((m) => [...m, { role: 'user', text: question, createdAt: new Date().toISOString() }]);
    setThinkStep(0);
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
        {
          role: 'doctor',
          id: data.id, // the saved answer, so "Send to Earth" survives a reload
          question, // kept so this answer can be sent to Earth on its own
          text: data.reply,
          source: data.source,
          redFlag: data.redFlag,
          redFlagReason: data.redFlagReason,
          sources: Array.isArray(data.sources) ? data.sources : [],
          createdAt: new Date().toISOString(),
        },
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

  // Saved answers, and those still travelling to the flight surgeon (not counting ones already on screen).
  const pastAnswers = past.filter((m) => m.role === 'doctor');
  const onScreen = new Set(messages.map((m) => m.id).filter(Boolean));
  const inTransit = pastAnswers
    .filter((m) => m.sentToEarth && !onScreen.has(m.id) && new Date(m.sentToEarth.arrivesAt).getTime() > pastLoadedAt)
    .sort((a, b) => new Date(a.sentToEarth.arrivesAt) - new Date(b.sentToEarth.arrivesAt));

  const header = (
    <header className={s.header}>
      {/* NABD means "heartbeats": a slow heartbeat line in the doctor's round mark. Decorative only. */}
      <span className={s.titleMark} aria-hidden="true">
        <span className={s.titleRing} />
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path className={s.beat} pathLength="100" d="M4 17h6l2.5-6 4 12 3-9 2 3h6.5" />
        </svg>
      </span>
      <div className={s.headText}>
        <h1 className={s.title}>AI doctor</h1>
        <span className={s.sub}>
          <span className={s.liveDot} aria-hidden="true" />
          Runs on the ship · works without Earth
        </span>
      </div>
      {missionState === 'ready' && crewId && view === 'chat' && (
        <button
          type="button"
          className={s.historyBtn}
          onClick={openHistory}
          aria-label={pastAnswers.length ? `Chat history, ${pastAnswers.length} answers` : 'Chat history'}
        >
          <ClockIcon />
          {pastAnswers.length > 0 && (
            <span className={s.count} aria-hidden="true">
              {pastAnswers.length > 99 ? '99+' : pastAnswers.length}
            </span>
          )}
        </button>
      )}
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

  // History view: "Back to chat" and the title stay pinned with the header, so she never has to scroll up.
  const historyBar = (
    <div className={s.historyBar}>
      <button type="button" className={s.backBtn} onClick={backToChat}>
        <svg className={s.icon16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Back to chat
      </button>
      <h2 className={s.historyTitle}>Chat history</h2>
    </div>
  );

  const top = (
    <div className={s.top}>
      {header}
      {view === 'history' && historyBar}

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
    </div>
  );

  // ---------- History view: her saved chat, only when she asks for it ----------
  if (view === 'history') {
    return (
      <main className={s.page}>
        {top}

        <section className={s.chat} aria-label="Chat history">
          <p className={s.muted}>
            Your earlier questions and answers. You can send any answer to {mission?.flightSurgeonOnEarth || 'the flight surgeon'} from here.
          </p>
          {pastState === 'loading' && (
            <p className={s.muted} role="status">
              Loading your chat history…
            </p>
          )}
          {pastState === 'error' && (
            <div className={s.sendError} role="alert">
              <p className={s.errorText}>Your chat history can't load right now.</p>
              <button type="button" className={s.secondaryBtn} onClick={openHistory}>
                Try again
              </button>
            </div>
          )}
          {pastState === 'ready' && past.length === 0 && (
            <p className={s.muted}>No earlier chats yet. Your questions and answers will be kept here.</p>
          )}
          {pastState !== 'error' && past.length > 0 && <Conversation messages={past} mission={mission} crewId={crewId} />}
        </section>
      </main>
    );
  }

  // ---------- Chat view: always opens clean ----------
  return (
    <main className={`${s.page} ${s.withComposer}`}>
      {/* Pinned while she scrolls: the title, and the emergency box if there is one. */}
      {top}

      <section className={s.chat} aria-label="Conversation" aria-live="polite">
        {/* Answers she sent earlier that are still travelling: proof the send is safe, without the old chat. */}
        {inTransit.length > 0 && (
          <button type="button" className={s.transit} onClick={openHistory}>
            <span className={s.transitDot} aria-hidden="true" />
            <span>
              <strong className={s.strong}>
                {inTransit.length === 1 ? '1 answer' : `${inTransit.length} answers`} on its way to{' '}
                {mission?.flightSurgeonOnEarth || 'the flight surgeon'}
              </strong>
              {` · arrives ${clock(inTransit[0].sentToEarth.arrivesAt)}`}
            </span>
          </button>
        )}

        {messages.length === 0 && !sending && (
          <div className={s.empty}>
            <p className={s.emptyTitle}>How are you feeling, {session?.name?.split(' ')[0] || 'today'}?</p>
            <p className={s.muted}>
              Describe a symptom or pick one below. I answer with your own data and the ship's medical kit. Earth is{' '}
              {mission?.earthDelayOneWay?.text || 'far'} away, so I help until the flight surgeon replies.
            </p>
          </div>
        )}

        <Conversation messages={messages} mission={mission} crewId={crewId} />

        {sending && (
          <div className={s.thinking} role="status">
            <DoctorMark />
            <span className={s.dots} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className={s.thinkText}>{THINKING_STEPS[thinkStep]}</span>
          </div>
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
