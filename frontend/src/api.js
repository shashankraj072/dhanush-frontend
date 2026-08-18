// When running locally, Vite's import.meta.env.DEV is true, so it uses localhost:5000.
// In production (Render), the frontend is served by the backend, so we use relative paths ('').
const API_BASE = import.meta.env.DEV ? 'http://localhost:5000' : ''

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.ok === false) {
    const detailMsg =
      json?.details?.message || json?.details?.error || json?.details?.reason
    const msg = detailMsg || json?.error || `Request failed: ${res.status}`
    const err = new Error(msg)
    err.details = json?.details
    throw err
  }
  return json
}

export function health() {
  return apiFetch('/api/health')
}

export function saveProfile(profile) {
  return apiFetch('/api/profile', { method: 'POST', body: JSON.stringify(profile) })
}

export function getRecommendations(userId) {
  return apiFetch(`/api/recommendations/${encodeURIComponent(userId)}`)
}

export function logWorkout(payload) {
  return apiFetch('/api/workout/log', { method: 'POST', body: JSON.stringify(payload) })
}

export function getProgress(userId) {
  return apiFetch(`/api/progress/${encodeURIComponent(userId)}`)
}
