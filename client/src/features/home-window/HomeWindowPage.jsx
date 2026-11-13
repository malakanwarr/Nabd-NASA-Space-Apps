// Family + Home window, ONE page at /family. It shows the Home window scene first (the living room at home
// at night, drawn from the saved avatars), then the hugs content of features/hugs/FamilyPage, then the
// voice-message recorder, messages from home, the time at home and a link to the avatar maker.
import { useEffect, useRef, useState } from 'react';
import FamilyPage from '../hugs/FamilyPage.jsx';
import ListRow from '../../shared/ListRow.jsx';
import Button from '../../shared/Button.jsx';
import { getSampleData } from '../../shared/sampleData.js';
import { useSession } from '../../shared/session.js';
import { CheckCircleIcon } from '../mood-face/Icons.jsx';
import SavedNote from '../mood-face/SavedNote.jsx';
import { loadWithSavedCopy } from '../mood-face/savedData.js';
import { FROM_HOME_FALLBACK } from './fromHomeSample.js';
import { ImageIcon, MicIcon } from './Icons.jsx';
import HomeScene from './HomeScene.jsx';
import { sendVoiceMessage } from './voiceMessageApi.js';
import { FAMILY_IDS, personMeta, useAvatars } from './useAvatars.js';
import AvatarFigure from '../avatar/AvatarFigure.jsx';
import { describe } from '../avatar/avatarOptions.js';
import s from './styles.module.css';

const MAX_SECONDS = 60;

// "19:40" -> "7:40 pm"
function twelveHour(time) {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
}

function joinNames(names) {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function clock(total) {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function currentTime() {
  return Date.now();
}

function recordingErrorMessage(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return 'The browser did not allow microphone access. Allow the microphone for this site and try again.';
  }
  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return 'No microphone is available on this device.';
  }
  if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
    return 'The microphone is busy or unavailable. Close other apps using it and try again.';
  }
  if (error?.name === 'NotSupportedError') {
    return 'This browser cannot record audio. Try a current browser.';
  }
  return error?.message ? `Recording failed: ${error.message}` : 'Recording failed. Please try again.';
}

export default function HomeWindowPage() {
  const [data, setData] = useState({ state: 'loading' }); // loading | ready
  const [phase, setPhase] = useState('idle'); // idle | requesting | recording | sending | sent | error
  const [seconds, setSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [previewRecording, setPreviewRecording] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const previewUrlRef = useRef('');
  const recorder = useRef(null);
  const stream = useRef(null);
  const chunks = useRef([]);
  const startedAt = useRef(0);
  const discardRecording = useRef(false);
  const mounted = useRef(true);
  const session = useSession();
  const crewId = session?.role === 'crew' ? session.id : '';
  const avatars = useAvatars(crewId);

  useEffect(() => {
    let cancelled = false;
    // Load the message history and crew context; saved and sample fallbacks keep the screen available offline.
    loadWithSavedCopy('home-window', async () => {
      const [fromHome, profile, mission] = await Promise.allSettled([
        getSampleData('from-home'),
        getSampleData('profile'),
        getSampleData('mission'),
      ]);
      if (profile.status === 'rejected' && mission.status === 'rejected') throw profile.reason;
      const home = { ...FROM_HOME_FALLBACK, ...(fromHome.status === 'fulfilled' ? fromHome.value : {}) };
      const delay = mission.status === 'fulfilled' ? mission.value.earthDelayOneWay?.minutes : null;
      return {
        home,
        delayMinutes: delay ?? home.delayMinutes,
        family: profile.status === 'fulfilled' ? (profile.value.family ?? []).map((f) => f.name) : [],
      };
    }, ['/api/data/profile', '/api/data/mission'])
      .then(({ data: loaded, saved }) => {
        if (!cancelled) setData({ state: 'ready', saved, ...loaded });
      })
      .catch(() => {
        // Nothing saved and no connection: still show the window, with the local fallback texts.
        if (!cancelled) setData({ state: 'ready', saved: false, home: FROM_HOME_FALLBACK, delayMinutes: FROM_HOME_FALLBACK.delayMinutes, family: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Count the seconds while recording.
  useEffect(() => {
    if (phase !== 'recording') return undefined;
    const timer = setInterval(() => {
      setSeconds(Math.min(MAX_SECONDS, Math.floor((Date.now() - startedAt.current) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'recording') return undefined;
    const remaining = Math.max(0, MAX_SECONDS * 1000 - (currentTime() - startedAt.current));
    const timer = setTimeout(() => {
      if (recorder.current?.state === 'recording') recorder.current.stop();
    }, remaining);
    return () => clearTimeout(timer);
  }, [phase]);

  // Leaving the page always stops the microphone and discards an unfinished recording.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      discardRecording.current = true;
      const activeRecorder = recorder.current;
      if (activeRecorder && activeRecorder.state !== 'inactive') {
        activeRecorder.ondataavailable = null;
        activeRecorder.onstop = null;
        activeRecorder.onerror = null;
        activeRecorder.stop();
      }
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      recorder.current = null;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    };
  }, []);

  function clearPreview() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = '';
    setPreviewUrl('');
    setPreviewRecording(null);
  }

  function showPreview(recording) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(recording.audio);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setPreviewRecording(recording);
  }

  async function startRecording() {
    if (phase === 'requesting' || phase === 'recording' || phase === 'sending') return;
    if (!crewId) {
      setRecordingError('Sign in as a crew member before recording a message.');
      setPhase('error');
      return;
    }

    setRecordingError('');
    setPreviewError('');
    clearPreview();
    setPhase('requesting');

    let activeStream;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        const error = new Error('Audio recording is not supported in this browser.');
        error.name = 'NotSupportedError';
        throw error;
      }

      activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        activeStream.getTracks().forEach((track) => track.stop());
        return;
      }

      const supportedTypes = ['audio/webm;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4'];
      const audioProbe = document.createElement('audio');
      const isRecorderTypeSupported = typeof MediaRecorder.isTypeSupported === 'function'
        ? (type) => MediaRecorder.isTypeSupported(type)
        : () => false;
      const mimeType = supportedTypes.find(
        (type) => isRecorderTypeSupported(type) && audioProbe.canPlayType(type),
      ) || supportedTypes.find(isRecorderTypeSupported);
      const media = mimeType
        ? new MediaRecorder(activeStream, { mimeType })
        : new MediaRecorder(activeStream);

      stream.current = activeStream;
      recorder.current = media;
      chunks.current = [];
      discardRecording.current = false;
      startedAt.current = currentTime();
      media.ondataavailable = (event) => {
        if (event.data?.size) chunks.current.push(event.data);
      };
      media.onerror = (event) => {
        discardRecording.current = true;
        activeStream.getTracks().forEach((track) => track.stop());
        stream.current = null;
        recorder.current = null;
        setRecordingError(recordingErrorMessage(event.error));
        setPhase('error');
      };
      media.onstop = () => {
        activeStream.getTracks().forEach((track) => track.stop());
        stream.current = null;
        if (recorder.current === media) recorder.current = null;
        if (!mounted.current || discardRecording.current) return;

        const recordedType = chunks.current.find((chunk) => chunk.type)?.type || media.mimeType;
        const audio = new Blob(chunks.current, recordedType ? { type: recordedType } : undefined);
        chunks.current = [];
        if (!audio.size) {
          setRecordingError('No audio was captured. Check the microphone and try again.');
          setPhase('error');
          return;
        }

        const durationSeconds = Math.max(
          1,
          Math.min(MAX_SECONDS, Math.ceil((currentTime() - startedAt.current) / 1000)),
        );
        showPreview({ audio, durationSeconds });
        setPhase('preview');
      };

      media.start();
      setSeconds(0);
      setPhase('recording');
    } catch (error) {
      activeStream?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      recorder.current = null;
      if (!mounted.current) return;
      setRecordingError(recordingErrorMessage(error));
      setPhase('error');
    }
  }

  function stopRecording() {
    const media = recorder.current;
    if (media?.state === 'recording') media.stop();
  }

  async function uploadRecording(recording) {
    if (!recording) return;
    setPhase('sending');
    setRecordingError('');
    try {
      const result = await sendVoiceMessage(crewId, recording.audio, recording.durationSeconds);
      if (!result?.message?.id) throw new Error('The server did not confirm the saved message.');
      if (!mounted.current) return;
      clearPreview();
      setPhase('sent');
    } catch (error) {
      if (!mounted.current) return;
      setRecordingError(`Your voice message could not be sent: ${error.message}`);
      setPhase('error');
    }
  }

  if (data.state === 'loading') {
    return <FamilyPage top={<p className={s.status} role="status">Looking out of the window…</p>} />;
  }

  const { home, family, delayMinutes } = data;
  const delayLine = `It reaches ${home.city} in about ${delayMinutes} minutes.`;

  const top = (
    <>
      {data.saved && <SavedNote />}

      <div className={s.clock}>
        <span className={s.time}>{home.localTime}</span>
        <span className={s.place}>{home.city} · {home.period}</span>
      </div>

      <HomeScene avatars={avatars} city={home.city} />
    </>
  );

  const bottom = (
    <>

      <div className={s.record}>
        {phase === 'sent' && (
          <p className={s.sent} role="status">
            <span className={s.sentIcon}><CheckCircleIcon /></span>
            <span>Voice message saved for your family. {delayLine}</span>
          </p>
        )}
        {recordingError && <p className={s.problem} role="alert">{recordingError}</p>}
        {previewError && <p className={s.problem} role="alert">{previewError}</p>}
        {phase === 'requesting' && (
          <p className={s.status} role="status">Connecting to the microphone…</p>
        )}
        {phase === 'sending' && (
          <p className={s.status} role="status">Sending your voice message…</p>
        )}
        {previewRecording && previewUrl && (phase === 'preview' || phase === 'sending' || phase === 'error') && (
          <div className={s.preview}>
            <p className={s.previewTitle}>Listen before sending · {clock(previewRecording.durationSeconds)}</p>
            <audio
              className={s.previewAudio}
              controls
              src={previewUrl}
              aria-label="Preview your voice message"
              onError={() => setPreviewError('This browser could not play the recording. Try recording again or use another browser.')}
              onLoadedMetadata={(event) => {
                if (!Number.isFinite(event.currentTarget.duration) || event.currentTarget.duration <= 0) {
                  setPreviewError('The recording has no playable audio. Try recording again.');
                }
              }}
            />
          </div>
        )}
        {phase === 'recording' ? (
          <>
            <p className={s.recording} role="status">
              <span className={s.recDot} aria-hidden="true" />
              <span className={s.num}>Recording {clock(seconds)}</span>
            </p>
            <Button onClick={stopRecording}>Stop recording</Button>
          </>
        ) : phase === 'preview' ? (
          <div className={s.previewActions}>
            <Button variant="secondary" onClick={startRecording}>Record again</Button>
            <Button disabled={Boolean(previewError)} onClick={() => uploadRecording(previewRecording)}>
              Send voice message
            </Button>
          </div>
        ) : phase === 'error' && previewRecording ? (
          <div className={s.previewActions}>
            <Button variant="secondary" onClick={startRecording}>Record again</Button>
            <Button disabled={Boolean(previewError)} onClick={() => uploadRecording(previewRecording)}>
              Try sending again
            </Button>
          </div>
        ) : (
          <Button
            variant={phase === 'sent' ? 'secondary' : 'primary'}
            disabled={phase === 'requesting' || phase === 'sending'}
            onClick={startRecording}
          >
            {phase === 'requesting'
              ? 'Connecting…'
              : phase === 'sending'
                ? 'Sending…'
                : phase === 'sent'
                  ? 'Record another message'
                  : phase === 'error'
                    ? 'Try recording again'
                    : 'Record a message home'}
          </Button>
        )}
        {phase !== 'sent' && <p className={s.note}>{delayLine}</p>}
      </div>

      <h2 className={s.section}>From home</h2>
      {home.messages.length === 0 ? (
        <p className={s.empty}>No messages yet. Record one for your family.</p>
      ) : (
        home.messages.map((m) => (
          <div key={m.id}>
            <ListRow
              icon={<span className={s.kind}>{m.kind === 'voice' ? <MicIcon /> : <ImageIcon />}</span>}
              title={m.title}
              subtitle={m.when}
            />
            {m.kind === 'voice' && m.mediaUrl && (
              m.demoPlaceholder
                ? <p className={s.emptyMedia}>No audio attached in this demo message.</p>
                : (
                  <audio className={s.historyAudio} controls preload="none" src={m.mediaUrl}>
                    Your browser cannot play this audio.
                  </audio>
                )
            )}
            {m.kind === 'photo' && m.mediaUrl && (
              <img className={s.historyPhoto} src={m.mediaUrl} alt={m.alt || m.title} />
            )}
          </div>
        ))
      )}


      <section className={s.homeCard} aria-label="Time at home">
        <h2>It's {twelveHour(home.localTime)} at home</h2>
        <p>Night has fallen over {home.city}. Your family is probably having dinner.</p>
      </section>

      <ListRow
        to="/family/avatar"
        icon={
          <span className={s.heads} aria-hidden="true">
            {[...FAMILY_IDS, 'you'].map((id) => (
              <span key={id} className={s.head}>
                <AvatarFigure
                  person={avatars[id]}
                  crew={id === 'you'}
                  child={personMeta(id).child}
                  label={describe(avatars[id], personMeta(id))}
                  className={s.headFigure}
                />
              </span>
            ))}
          </span>
        }
        title="Change how you and your family look"
        subtitle={joinNames(family.length ? family : FAMILY_IDS.map((id) => personMeta(id).name))}
        right={<span className={s.chevron} aria-hidden="true">›</span>}
      />
    </>
  );

  return <FamilyPage top={top} bottom={bottom} />;
}
