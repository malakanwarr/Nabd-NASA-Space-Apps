// Camera panel (owner: Habiba), used inside Malak's RecordPage. Board 8.
//
// <FaceCamera onDone={(metrics) => ...} onVoiceOnly={() => ...} onStatus={(status) => ...} />
//   onDone      called once with { blinksPerMin, eyeOpenness, smileRate } when the face check finishes
//   onVoiceOnly called when the person taps "Continue with voice only" in the error state
//   onStatus    called when the status changes (so the page can hide the sentence while paused)
//   autoStart   starts the camera on its own. Default: only when the person came from the start
//               screen's "Allow camera and mic" tap (navigation state { permitted: true }).
// Video is never stored or sent: only the three numbers leave this component.
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Button from '../../shared/Button.jsx';
import FaceErrorState from './FaceErrorState.jsx';
import { CheckCircleIcon, LockIcon } from './Icons.jsx';
import useFaceMetrics from './useFaceMetrics.js';
import s from './styles.module.css';

const DOTS = [33, 133, 362, 263, 1, 61, 291, 152, 10, 234, 454, 13]; // eyes, nose, mouth, chin, brow, cheeks
const ERROR_STATES = ['no-face', 'blocked', 'error'];

function clock(ms) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function FaceCamera({ onDone, onVoiceOnly, onStatus, autoStart }) {
  const location = useLocation();
  const shouldAutoStart = autoStart ?? Boolean(location.state?.permitted);
  const { start, metrics, status, elapsedMs, durationMs, landmarksRef } = useFaceMetrics();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const callbacks = useRef({});
  callbacks.current = { onDone, onVoiceOnly, onStatus };

  useEffect(() => {
    if (shouldAutoStart) start(videoRef.current);
  }, [shouldAutoStart, start]);

  useEffect(() => {
    callbacks.current.onStatus?.(status);
    if (status === 'done') callbacks.current.onDone?.(metrics);
    // metrics is read only at the moment the status becomes 'done'
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Tracking dots on top of the video.
  useEffect(() => {
    if (status !== 'running') return undefined;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    const color = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    let frame;
    function draw() {
      const w = video.videoWidth || canvas.width;
      const h = video.videoHeight || canvas.height;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      const face = landmarksRef.current;
      if (face) {
        ctx.fillStyle = color;
        for (const i of DOTS) {
          ctx.beginPath();
          ctx.arc(face[i].x * w, face[i].y * h, w * 0.007, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      frame = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(frame);
  }, [status, landmarksRef]);

  const failed = ERROR_STATES.includes(status);
  const done = status === 'done';
  const live = status === 'running';

  return (
    <div>
      <div className={s.panel} hidden={failed || done}>
        <video ref={videoRef} className={s.video} playsInline muted aria-label="Camera preview" />
        <canvas ref={canvasRef} className={s.dots} aria-hidden="true" />
        <span className={s.bracketTL} />
        <span className={s.bracketTR} />
        <span className={s.bracketBL} />
        <span className={s.bracketBR} />
        {status === 'running' && <span className={s.scan} aria-hidden="true" />}

        {status === 'idle' && (
          <div className={s.panelCenter}>
            <Button onClick={() => start(videoRef.current)}>Turn on camera</Button>
          </div>
        )}
        {status === 'loading' && (
          <div className={s.panelCenter}>
            <p className={s.panelMessage}>Starting the camera…</p>
          </div>
        )}

        {live && (
          <>
            <span className={`${s.chip} ${s.chipTop}`}>
              <span className={s.recDot} aria-hidden="true" />
              <span className={s.num}>REC {clock(elapsedMs)} / {clock(durationMs)}</span>
            </span>
          </>
        )}
      </div>

      {done && (
        <section className={s.done} role="status">
          <span className={s.doneIcon}><CheckCircleIcon /></span>
          <h2 className={s.doneTitle}>Face check done</h2>
          <p className={s.doneNote}>
            <LockIcon />
            <span>No video was saved.</span>
          </p>
        </section>
      )}

      {failed && (
        <FaceErrorState
          kind={status}
          onRetry={() => start(videoRef.current)}
          onVoiceOnly={() => callbacks.current.onVoiceOnly?.()}
        />
      )}
    </div>
  );
}
