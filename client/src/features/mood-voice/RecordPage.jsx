// Record page, screen #8 "Step 1: face and voice" (owner: Malak).
// Route: /checkin/record · next step: /checkin/game
//
// Habiba's FaceCamera does the camera and the face numbers; this page does the voice,
// the sentence to read and the step. Nothing of the video or the sound is kept: the face
// gives three numbers, the voice gives four, and that is all that travels on.
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import StepProgress from '../../shared/StepProgress.jsx';
import Button from '../../shared/Button.jsx';
import FaceCamera from '../mood-face/FaceCamera.jsx';
import useVoiceMetrics, { DURATION_MS } from './useVoiceMetrics.js';
import { clearDraft, saveDraft } from './checkinDraft.js';
import s from './styles.module.css';

// The same sentence every day, so only the voice changes.
const SENTENCE = 'Every heartbeat carries us closer to Mars, one calm morning at a time.';

// While the camera is in one of these states, Habiba's component shows its own
// "We can't see your face" screen, so the rest of this page steps out of the way.
const FACE_PROBLEM = ['no-face', 'blocked', 'error'];

const BARS = 24;

function clock(ms) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function RecordPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // 'face' is the camera and the microphone, 'voice' is the microphone only.
  // No navigation state means somebody opened the URL directly: treat it as face mode,
  // and Habiba's component then offers its own "Turn on camera" button.
  const [mode, setMode] = useState(location.state?.mode ?? 'face');
  const [face, setFace] = useState(null);
  const [faceStatus, setFaceStatus] = useState('idle');

  const { start, stop, status, metrics, message, level, elapsedMs } = useVoiceMetrics();

  const faceTrouble = mode === 'face' && FACE_PROBLEM.includes(faceStatus);
  const listening = status === 'running';
  const voiceFinished = status === 'done' || status === 'error' || status === 'blocked';
  const voiceNumbers = status === 'done' ? metrics : null;
  // In face mode the face check must finish first: leaving the page stops the camera before the numbers arrive.
  const faceReady = mode === 'voice' || faceStatus === 'done';

  // The camera says "carry on with voice only": drop the camera, keep the microphone.
  function voiceOnly() {
    setMode('voice');
    setFace(null);
  }

  // Step 2 is Salma's pollen catch. The numbers travel in the navigation state and in the
  // draft, so the results screen still has them if the game page does not pass them on.
  function goToGame() {
    const draft = { face: mode === 'voice' ? null : face, voice: voiceNumbers };
    saveDraft(draft);
    navigate('/checkin/game', { state: draft });
  }

  // Stop the microphone as soon as the camera runs into trouble, so nothing is listening
  // behind an error screen.
  useEffect(() => {
    if (faceTrouble && listening) stop();
  }, [faceTrouble, listening, stop]);

  const secondsLine = `${clock(elapsedMs)} / ${clock(DURATION_MS)}`;

  return (
    <main>
      <header className={s.top}>
        {/* Leaving half way throws the draft away, so it cannot turn up later as today's news. */}
        <Link to="/checkin" className={s.cancel} onClick={clearDraft}>
          Cancel
        </Link>
        <div className={s.step}>
          <StepProgress step={1} total={3} label="Face and voice" />
        </div>
      </header>

      {mode === 'face' ? (
        <FaceCamera onDone={setFace} onVoiceOnly={voiceOnly} onStatus={setFaceStatus} />
      ) : (
        <section className={s.voiceOnly} aria-label="Voice only">
          <svg
            className={s.micBig}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
          </svg>
          <p className={s.voiceOnlyWord}>Voice only today</p>
          <p className={s.muted}>The camera stays off. We listen to your voice for 30 seconds.</p>
        </section>
      )}

      {/* While the camera shows its own error screen, the sentence, the waveform and the
          next step wait. */}
      {!faceTrouble && (
        <>
          <section className={s.sentence} aria-label="Read out loud">
            <p className={s.eyebrow}>Read this out loud twice, at a calm pace.</p>
            <p className={s.words}>“{SENTENCE}”</p>
          </section>

          <section
            className={`${s.listen} ${status === 'done' ? s.listenDone : ''}`}
            aria-label="Microphone"
          >
            {status === 'idle' && (
              <p className={s.muted}>Tap the button, then read the sentence out loud twice.</p>
            )}

            {status === 'loading' && <p className={s.muted}>Opening the microphone…</p>}

            {listening && (
              <div className={s.wave}>
                <div className={s.bars} role="img" aria-label="The microphone is listening">
                  {Array.from({ length: BARS }, (_, i) => (
                    <span
                      key={i}
                      className={s.bar}
                      style={{ '--bar': Math.max(0.12, level * (0.55 + ((i * 7) % 10) / 14)) }}
                    />
                  ))}
                </div>
                <p className={s.timer}>
                  <span className={s.rec} aria-hidden="true" />
                  {secondsLine}
                </p>
              </div>
            )}

            {status === 'done' && (
              <p className={s.doneWord} role="status">
                Voice check done
              </p>
            )}

            {(status === 'error' || status === 'blocked') && (
              <p className={s.problem} role="alert">
                {message}
              </p>
            )}
          </section>
        </>
      )}

      {!faceTrouble && (
        <div className={s.bottom}>
          {status === 'idle' && (
            <Button onClick={() => start()}>Start the 30-second voice check</Button>
          )}

          {listening && (
            <Button variant="secondary" onClick={stop}>
              I have finished reading
            </Button>
          )}

          {status === 'error' && (
            <Button variant="secondary" onClick={() => start()}>
              Try the voice check again
            </Button>
          )}

          {voiceFinished && faceReady && (
            <>
              <Button onClick={goToGame}>Next: Pollen catch</Button>
              {status !== 'done' && (
                <p className={s.muted}>
                  We will carry on without the voice numbers. Your check-in still works.
                </p>
              )}
            </>
          )}

          {voiceFinished && !faceReady && (
            <>
              <p className={s.muted} role="status">
                {faceStatus === 'idle'
                  ? 'Turn on the camera above to finish the face check.'
                  : 'Finishing the face check…'}
              </p>
              {faceStatus === 'idle' && (
                <Button variant="text" onClick={voiceOnly}>
                  Continue with voice only
                </Button>
              )}
            </>
          )}

          {status === 'loading' && <p className={s.muted}>One moment…</p>}

          <p className={s.privacy}>
            <svg
              className={s.lock}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            Video and audio never leave your phone
          </p>
        </div>
      )}
    </main>
  );
}
