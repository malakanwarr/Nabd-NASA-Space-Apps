import { apiFetch } from '../../shared/api.js';

// A hug carries only who sent it. Never add medical details here.
export const sendHug = (from) => apiFetch('/api/hugs', { method: 'POST', body: { from } });

export const fetchNewHugs = (sinceIso) =>
  apiFetch(`/api/hugs/new?since=${encodeURIComponent(sinceIso)}`);
