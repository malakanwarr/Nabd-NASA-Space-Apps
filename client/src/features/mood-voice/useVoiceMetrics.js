// Voice metrics hook (owner: Malak). Stub: the real meyda / pitchy code goes here.
// useVoiceMetrics() -> { start(), stop(), metrics, status }
import { useState } from 'react';

export default function useVoiceMetrics() {
  const [metrics] = useState({ pitchRangeHz: null, loudness: null, pauseRatio: null, paceSegmentsPerSec: null });
  const [status] = useState('idle'); // TODO: 'idle' | 'listening' | 'done' | 'error'

  function start() {
    // TODO: ask for the microphone and start measuring.
  }

  function stop() {
    // TODO: stop the microphone and finish the numbers.
  }

  return { start, stop, metrics, status };
}
