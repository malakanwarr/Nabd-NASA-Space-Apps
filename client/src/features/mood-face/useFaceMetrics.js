// Face metrics hook (owner: Habiba). Stub: the real MediaPipe code goes here.
// useFaceMetrics() -> { start(videoElement), stop(), metrics, status }
import { useState } from 'react';

export default function useFaceMetrics() {
  const [metrics] = useState({ blinksPerMin: null, eyeOpenness: null, smileRate: null });
  const [status] = useState('idle'); // TODO: 'idle' | 'loading' | 'running' | 'error'

  function start(/* videoElement */) {
    // TODO: load the model from /models/face_landmarker.task and start reading blinks, eyes, smile.
  }

  function stop() {
    // TODO: stop the camera and the analysis.
  }

  return { start, stop, metrics, status };
}
