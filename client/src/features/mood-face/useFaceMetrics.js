// Face metrics hook (owner: Habiba).
// useFaceMetrics() -> { start(videoElement), stop(), metrics, status, elapsedMs, durationMs, landmarksRef }
//
// The first four are the agreed contract with Malak. The last three are extras for the camera panel.
// metrics = { blinksPerMin, eyeOpenness, smileRate } (null until a few seconds of face were seen).
// status  = 'idle' | 'loading' | 'running' | 'no-face' | 'blocked' | 'error' | 'done'
//
// Privacy: video never leaves this hook. Frames are read, turned into three numbers, and thrown away.
import { useCallback, useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export const DURATION_MS = 30000; // time with a face in view (board 8 shows 0:30)
const FRAME_MS = 100; // about 10 frames a second
const NO_FACE_MS = 3000; // no face for 3 seconds -> "We can't see your face"
const MIN_FACE_MS = 3000; // show numbers only after this much face time
const PUBLISH_MS = 500; // how often the screen gets new numbers
const BLINK_LEVEL = 0.5; // blink and smile scores above this count

const EMPTY = { blinksPerMin: null, eyeOpenness: null, smileRate: null };

// The model loads once and is reused, so "Try again" is quick and works offline.
let landmarkerPromise = null;
function loadLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const files = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
      const make = (delegate) =>
        FaceLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: '/models/face_landmarker.task', delegate },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
        });
      try {
        return await make('GPU');
      } catch {
        return await make('CPU'); // some phones have no GPU support for this
      }
    })();
    landmarkerPromise.catch(() => {
      landmarkerPromise = null; // let "Try again" load it again
    });
  }
  return landmarkerPromise;
}

function score(categories, name) {
  const found = categories.find((c) => c.categoryName === name);
  return found ? found.score : 0;
}

export default function useFaceMetrics() {
  const [metrics, setMetrics] = useState(EMPTY);
  const [status, setStatus] = useState('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const runRef = useRef(null);
  const landmarksRef = useRef(null); // latest face points, for the tracking dots

  const stop = useCallback(() => {
    const run = runRef.current;
    if (!run) return;
    runRef.current = null;
    run.cancelled = true;
    clearInterval(run.timer);
    if (run.stream) run.stream.getTracks().forEach((t) => t.stop());
    if (run.video) run.video.srcObject = null;
    landmarksRef.current = null;
  }, []);

  const start = useCallback(
    async (video) => {
      stop();
      if (!video) return;
      const run = { video, stream: null, timer: null, cancelled: false };
      runRef.current = run;
      setMetrics(EMPTY);
      setElapsedMs(0);
      setStatus('loading');

      const fail = (next) => {
        if (run.cancelled) return;
        stop();
        setStatus(next);
      };

      if (!navigator.mediaDevices?.getUserMedia) return fail('error'); // needs HTTPS on a phone

      try {
        run.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false, // the microphone belongs to Malak's voice hook
        });
      } catch (err) {
        return fail(err.name === 'NotAllowedError' || err.name === 'SecurityError' ? 'blocked' : 'error');
      }
      if (run.cancelled) {
        run.stream.getTracks().forEach((t) => t.stop());
        return;
      }

      let landmarker;
      try {
        landmarker = await loadLandmarker();
      } catch {
        return fail('error');
      }
      if (run.cancelled) return;

      video.srcObject = run.stream;
      try {
        await video.play();
      } catch {
        return fail('error');
      }
      if (run.cancelled) return;

      const t0 = performance.now();
      const acc = { faceMs: 0, frames: 0, blinks: 0, blinkSum: 0, smileFrames: 0, blinking: false };
      let lastTick = t0;
      let lastFace = t0;
      let lastPublish = 0;
      setStatus('running');

      const publish = () => {
        const minutes = acc.faceMs / 60000;
        const ready = acc.faceMs >= MIN_FACE_MS && acc.frames > 0;
        setElapsedMs(Math.min(acc.faceMs, DURATION_MS));
        setMetrics(
          ready
            ? {
                blinksPerMin: Math.round(acc.blinks / minutes),
                eyeOpenness: Math.round((1 - acc.blinkSum / acc.frames) * 100) / 100,
                smileRate: Math.round((acc.smileFrames / acc.frames) * 100) / 100,
              }
            : EMPTY,
        );
      };

      run.timer = setInterval(() => {
        if (run.cancelled || video.readyState < 2) return;
        const now = performance.now();
        const dt = Math.min(now - lastTick, FRAME_MS * 3);
        lastTick = now;

        const result = landmarker.detectForVideo(video, now);
        const face = result.faceLandmarks?.[0];
        const shapes = result.faceBlendshapes?.[0]?.categories;

        if (!face || !shapes) {
          landmarksRef.current = null;
          if (now - lastFace > NO_FACE_MS) fail('no-face');
          return;
        }

        lastFace = now;
        landmarksRef.current = face;
        const blink = (score(shapes, 'eyeBlinkLeft') + score(shapes, 'eyeBlinkRight')) / 2;
        const smile = (score(shapes, 'mouthSmileLeft') + score(shapes, 'mouthSmileRight')) / 2;

        acc.faceMs += dt;
        acc.frames += 1;
        acc.blinkSum += blink;
        if (blink > BLINK_LEVEL && !acc.blinking) acc.blinks += 1; // score crossed 0.5 going up
        acc.blinking = blink > BLINK_LEVEL;
        if (smile > BLINK_LEVEL) acc.smileFrames += 1;

        if (acc.faceMs >= DURATION_MS) {
          publish();
          stop();
          setStatus('done');
        } else if (now - lastPublish >= PUBLISH_MS) {
          lastPublish = now;
          publish();
        }
      }, FRAME_MS);
    },
    [stop],
  );

  useEffect(() => stop, [stop]); // leaving the page always turns the camera off

  return { start, stop, metrics, status, elapsedMs, durationMs: DURATION_MS, landmarksRef };
}
