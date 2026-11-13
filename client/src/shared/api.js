// Talks to the server (Malak only). JSON in, JSON out, readable error on failure.
const BASE = import.meta.env.VITE_API_URL || '';

export async function apiFetch(path, options = {}) {
  const { body, headers, ...rest } = options;
  let res;
  try {
    res = await fetch(BASE + path, {
      ...rest,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach the server. Check that it is running.');
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // empty or non-JSON answer
  }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}
