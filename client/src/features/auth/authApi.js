import { apiFetch } from '../../shared/api.js';
import { getSampleData } from '../../shared/sampleData.js';

export const WRONG_PIN = 'Wrong PIN';

// GET /api/crew is Salma's endpoint and may still be a placeholder (not an array): fall back to sample data.
export async function fetchCrew() {
  try {
    const list = await apiFetch('/api/crew');
    if (Array.isArray(list) && list.length > 0) return list;
  } catch {
    // fall through to sample data
  }
  const data = await getSampleData('crew');
  return data.crew.map(({ id, name, role, initials, avatar }) => ({
    id,
    name,
    role,
    initials,
    avatar,
  }));
}

export function verifyCrewPin(crewId, pin) {
  return apiFetch('/api/auth/crew', { method: 'POST', body: { crewId, pin } });
}
