// Voice metrics hook (owner: Malak).
// useVoiceMetrics() -> { start, stop, metrics, status, message, level, elapsedMs }
//
// Privacy: the sound is measured while it passes and is never recorded, stored or sent.
// Only these four numbers leave the hook:
//   pitchRangeHz         how much the voice moves up and down (90th minus 10th percentile)
//   loudness             average loudness while actually speaking (Meyda rms)
//   pauseRatio           share of the time spent quiet, between the first and the last word
//   paceSegmentsPerSec   speaking bursts per second
//
// The microphone only opens inside start(), which must be called from a tap, so iPhone
// allows it. The check runs for 30 seconds, the same as Habiba's face check.
import { useCallback, useEffect, useRef, useState } from 'react';
import Meyda from 'meyda';
import { PitchDetector } from 'pitchy';

// Same length as DURATION_MS in mood-face/useFaceMetrics.js.
export const DURATION_MS = 30000;

// Meyda hands over one frame of this many samples, about 21 ms at 48 kHz. Short frames
// follow the start and end of each word closely, which is what the pace and the pauses need.
const FRAME_SAMPLES = 1024;

// Pitch needs a longer look than one frame: 2048 samples is about 43 ms, enough for two
// periods of a 60 Hz voice. So the last two frames are kept and the pitch is read off both.
const PITCH_SAMPLES = 2048;

// Pitchy only believes a pitch this clear, and only a human speaking range.
const MIN_CLARITY = 0.8;
const MIN_PITCH_HZ = 60;
const MAX_PITCH_HZ = 500;

// Pitchy ignores a frame quieter than this. Low, so a soft voice is still heard: the ends of
// phrases are the quietest and the lowest, and losing them flattens the pitch range.
const MIN_VOLUME_DB = -60;

// Anything below this is silence, whatever the room noise is doing.
const SILENCE_RMS = 0.004;

// How far above the quiet floor a frame has to be to count as speaking.
const SPEAKING_ABOVE_FLOOR = 0.15;

// A quiet moment this long ends a speaking burst, which is how the pace is counted.
const GAP_MS = 45;

// We need this much speech, and this much of it voiced, before the numbers mean anything.
const MIN_SPEAKING_MS = 850;
const MIN_VOICED_MS = 450;

const EMPTY = { pitchRangeHz: null, loudness: null, pauseRatio: null, paceSegmentsPerSec: null };

function percentile(sorted, share) {
  if (!sorted.length) return null;
  const at = (sorted.length - 1) * share;
  const low = Math.floor(at);
  const high = Math.ceil(at);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (at - low);
}

/**
 * Turns the measured frames into the four numbers.
 * frames: [{ rms, pitch }] one every ~21 ms, pitch is null when it was not clear enough.
 * frameMs: how long one frame lasts, so the lengths below stay in real time.
 */
export function metricsFromFrames(frames, frameMs) {
  const minSpeakingFrames = Math.max(2, Math.round(MIN_SPEAKING_MS / frameMs));
  const minVoicedFrames = Math.max(2, Math.round(MIN_VOICED_MS / frameMs));
  const gapFrames = Math.max(1, Math.round(GAP_MS / frameMs));
  if (frames.length < minSpeakingFrames) return null;

  // Where is the line between quiet and speaking? Take it from this recording, so a noisy
  // module and a quiet one both work.
  const loudnesses = frames.map((f) => f.rms).sort((a, b) => a - b);
  const floor = percentile(loudnesses, 0.1);
  const peak = percentile(loudnesses, 0.95);
  const threshold = Math.max(SILENCE_RMS, floor + (peak - floor) * SPEAKING_ABOVE_FLOOR);

  const speaking = frames.map((f) => f.rms >= threshold || f.pitch !== null);

  // Measure only between the first and the last word: silence before and after is ignored.
  const first = speaking.indexOf(true);
  const last = speaking.lastIndexOf(true);
  if (first < 0 || last - first < minSpeakingFrames) return null;

  const window = frames.slice(first, last + 1);
  const windowSpeaking = speaking.slice(first, last + 1);

  const spokenFrames = window.filter((f, i) => windowSpeaking[i]);
  if (spokenFrames.length < minSpeakingFrames) return null;

  // Loudness: the average while she is actually speaking.
  const loudness = spokenFrames.reduce((sum, f) => sum + f.rms, 0) / spokenFrames.length;

  // Pauses: the share of the time between the first and the last word spent quiet.
  const quiet = windowSpeaking.filter((is) => !is).length;
  const pauseRatio = quiet / windowSpeaking.length;

  // Pitch range: how far the voice moves, ignoring the extremes.
  const pitches = window
    .filter((f) => f.pitch !== null)
    .map((f) => f.pitch)
    .sort((a, b) => a - b);
  const pitchRangeHz =
    pitches.length >= minVoicedFrames
      ? Math.max(0, percentile(pitches, 0.9) - percentile(pitches, 0.1))
      : null;

  // Pace: how many separate bursts of speech per second. A short quiet moment ends a burst.
  let bursts = 0;
  let quietRun = gapFrames; // so the first speaking frame starts a burst
  windowSpeaking.forEach((is) => {
    if (is) {
      if (quietRun >= gapFrames) bursts += 1;
      quietRun = 0;
    } else {
      quietRun += 1;
    }
  });
  const seconds = (windowSpeaking.length * frameMs) / 1000;
  const paceSegmentsPerSec = seconds > 0 ? bursts / seconds : null;

  const round = (n, places) => (n === null ? null : Number(n.toFixed(places)));
  return {
    pitchRangeHz: round(pitchRangeHz, 1),
    loudness: round(loudness, 4),
    pauseRatio: round(pauseRatio, 3),
    paceSegmentsPerSec: round(paceSegmentsPerSec, 2),
  };
}

export default function useVoiceMetrics() {
  const [metrics, setMetrics] = useState(EMPTY);
  const [status, setStatus] = useState('idle'); // idle | loading | running | done | blocked | error
  const [message, setMessage] = useState(null);
  const [level, setLevel] = useState(0); // 0 to 1, for the waveform
  const [elapsedMs, setElapsedMs] = useState(0);

  const streamRef = useRef(null);
  const contextRef = useRef(null);
  const analyzerRef = useRef(null);
  const framesRef = useRef([]);
  const detectorRef = useRef(null);
  const startedAtRef = useRef(0);
  const timersRef = useRef([]);
  const liveRef = useRef(false);

  // Close the microphone and everything hanging off it. Safe to call twice.
  const letGo = useCallback(() => {
    liveRef.current = false;
    timersRef.current.forEach((t) => {
      clearInterval(t);
      clearTimeout(t);
    });
    timersRef.current = [];
    if (analyzerRef.current) {
      try {
        analyzerRef.current.stop();
      } catch {
        // already stopped
      }
      analyzerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (contextRef.current) {
      contextRef.current.close().catch(() => {});
      contextRef.current = null;
    }
  }, []);

  // Work out the four numbers and finish. Called by the timer or by stop().
  const finish = useCallback(() => {
    if (!liveRef.current) return;
    const context = contextRef.current;
    const frameMs = context ? (FRAME_SAMPLES / context.sampleRate) * 1000 : 21;
    const frames = framesRef.current;
    letGo();
    const result = metricsFromFrames(frames, frameMs);
    if (!result) {
      setMetrics(EMPTY);
      setStatus('error');
      setMessage('We could not hear enough. Find a quieter spot and read the sentence out loud.');
      return;
    }
    setMetrics(result);
    setLevel(0);
    setStatus('done');
    setMessage(null);
  }, [letGo]);

  // Opens the microphone and starts measuring. Call this from a tap.
  const start = useCallback(async () => {
    if (liveRef.current) return;
    setStatus('loading');
    setMessage(null);
    setMetrics(EMPTY);
    setElapsedMs(0);
    framesRef.current = [];

    let stream;
    try {
      // The settings below are off on purpose: they would change the loudness we measure.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (err) {
      const blocked = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      setStatus(blocked ? 'blocked' : 'error');
      setMessage(
        blocked
          ? 'The microphone is off. Turn it on in Settings › NABD › Permissions, or carry on with the face check only.'
          : 'We cannot reach the microphone on this phone.',
      );
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContextClass();
      await context.resume(); // iPhone needs this inside the tap
      const source = context.createMediaStreamSource(stream);
      const detector = PitchDetector.forFloat32Array(PITCH_SAMPLES);
      detector.minVolumeDecibels = MIN_VOLUME_DB;
      // The last PITCH_SAMPLES samples, oldest first, refilled frame by frame.
      const pitchWindow = new Float32Array(PITCH_SAMPLES);
      let framesSeen = 0;

      streamRef.current = stream;
      contextRef.current = context;
      detectorRef.current = detector;
      liveRef.current = true;

      let sinceLevelUpdate = 0;
      const analyzer = Meyda.createMeydaAnalyzer({
        audioContext: context,
        source,
        bufferSize: FRAME_SAMPLES,
        // 'rect' means "leave the sound alone". Meyda's usual hanning window fades each frame
        // in and out, which quietens the loudness it reports and stops pitchy recognising a
        // pitch at all in about half the frames.
        windowingFunction: 'rect',
        featureExtractors: ['rms', 'buffer'],
        callback: (features) => {
          if (!liveRef.current || !features) return;
          const rms = features.rms || 0;
          let pitch = null;
          if (features.buffer && features.buffer.length) {
            // Slide the frame into the pitch window and read the pitch off the whole window.
            const take = Math.min(features.buffer.length, PITCH_SAMPLES);
            pitchWindow.copyWithin(0, take);
            pitchWindow.set(features.buffer, PITCH_SAMPLES - take);
            framesSeen += 1;
            if (framesSeen >= PITCH_SAMPLES / take) {
              const [hz, clarity] = detector.findPitch(pitchWindow, context.sampleRate);
              if (clarity > MIN_CLARITY && hz >= MIN_PITCH_HZ && hz <= MAX_PITCH_HZ) pitch = hz;
            }
          }
          // Only these two numbers per frame are kept; the sound itself is dropped here.
          framesRef.current.push({ rms, pitch });

          // Feed the waveform, but not on every single frame.
          sinceLevelUpdate += 1;
          if (sinceLevelUpdate >= 3) {
            sinceLevelUpdate = 0;
            setLevel(Math.min(1, rms * 12));
          }
        },
      });
      analyzer.start();
      analyzerRef.current = analyzer;

      startedAtRef.current = Date.now();
      setStatus('running');
      timersRef.current.push(
        setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 250),
      );
      timersRef.current.push(setTimeout(() => finish(), DURATION_MS));
    } catch (err) {
      letGo();
      setStatus('error');
      setMessage('We could not listen on this phone. ' + (err.message || ''));
    }
  }, [finish, letGo]);

  // Finish early, keeping whatever we heard so far.
  const stop = useCallback(() => {
    if (liveRef.current) finish();
    else letGo();
  }, [finish, letGo]);

  // Leaving the page closes the microphone.
  useEffect(() => letGo, [letGo]);

  return { start, stop, metrics, status, message, level, elapsedMs };
}
