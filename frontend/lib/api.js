const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  // Auth
  register: (email, password) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  // Kits
  listKits: () => request('/api/kits'),
  getKit: (id) => request(`/api/kits/${id}`),
  deleteKit: (id) => request(`/api/kits/${id}`, { method: 'DELETE' }),
  updateKit: (id, data) =>
    request(`/api/kits/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateFlashcardConfidence: (kitId, cardId, confidence) =>
    request(`/api/kits/${kitId}/flashcards/${cardId}/confidence`, {
      method: 'PATCH',
      body: JSON.stringify({ confidence }),
    }),

  // Generation
  createKit: (jd, company_url, days) =>
    request('/api/generate', { method: 'POST', body: JSON.stringify({ jd, company_url, days }) }),
  regenerateSection: (kitId, section) =>
    request(`/api/generate/${kitId}/regenerate/${section}`, { method: 'POST' }),

  // SSE stream URL (used directly with EventSource)
  streamUrl: (kitId) => `${BASE}/api/generate/${kitId}/stream`,
};

export function streamKitGeneration(kitId, onEvent, onComplete, onError) {
  const token = getToken();
  const url = `${BASE}/api/generate/${kitId}/stream`;

  const es = new EventSource(url + (token ? `?token=${token}` : ''));
  let settled = false;

  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.step === 'complete') {
        settled = true;
        es.close();
        onComplete(data);
      } else if (data.step === 'error') {
        settled = true;
        es.close();
        onError(new Error(data.message));
      } else {
        onEvent(data);
      }
    } catch {}
  };

  es.onerror = () => {
    if (settled) return; // server closed connection after complete — not a real error
    es.close();
    onError(new Error('Connection lost'));
  };

  return () => es.close();
}
