// API client for the backend
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error(body.error || `API error ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }

  return res.json();
}

// Auth
export const authApi = {
  register: (email: string, password: string) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),

  login: (email: string, password: string) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  logout: () => apiFetch('/auth/logout', { method: 'POST' }),

  me: () => apiFetch('/auth/me'),
};

// Kits
export const kitsApi = {
  list: () => apiFetch('/kits'),

  get: (id: string) => apiFetch(`/kits/${id}`),

  create: (data: { jd: string; companyUrl: string; days: number }) =>
    apiFetch('/kits', { method: 'POST', body: JSON.stringify(data) }),

  patch: (id: string, data: Record<string, any>) =>
    apiFetch(`/kits/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) => apiFetch(`/kits/${id}`, { method: 'DELETE' }),

  regenerate: (id: string, section: string, category?: string) =>
    apiFetch(`/kits/${id}/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ section, category }),
    }),

  recordPractice: (id: string, flashcardId: string, confidence: number) =>
    apiFetch(`/kits/${id}/practice`, {
      method: 'POST',
      body: JSON.stringify({ flashcardId, confidence }),
    }),

  batchCreate: (cases: Array<{ id: string; jd: string; companyUrl: string; days: number }>) =>
    apiFetch('/kits/batch', { method: 'POST', body: JSON.stringify({ cases }) }),

  streamUrl: (id: string) => `${BASE_URL}/kits/${id}/stream`,
};
