// Loads sample data files from the server (Malak only): getSampleData('today') -> GET /api/data/today.
import { apiFetch } from './api.js';

export function getSampleData(name) {
  return apiFetch(`/api/data/${name}`);
}
