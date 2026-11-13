import { apiFetch } from '../../shared/api.js';

export function sendVoiceMessage(crewId, audio, durationSeconds) {
  const path = `/api/family/messages?crewId=${encodeURIComponent(crewId)}`;
  return apiFetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': audio.type || 'audio/webm',
      'X-Duration-Seconds': String(durationSeconds),
    },
    body: audio,
  });
}
