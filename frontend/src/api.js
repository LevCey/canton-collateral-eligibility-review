const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const get = (path) => fetch(`${API}${path}`).then(r => r.json())
const post = (path, body) => fetch(`${API}${path}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}).then(r => r.json())

export const api = {
  health: () => get('/health'),
  network: () => get('/network'),
  listCases: () => get('/cases'),
  createCase: (data) => post('/cases', data),
  listTasks: (role) => get(`/tasks?role=${role}`),
  submitReview: (contractId, body) => post(`/tasks/${contractId}/review`, body),
  listResults: (role) => get(`/results?role=${role}`),
  finalize: (contractId, body) => post(`/cases/${contractId}/finalize`, body),
  getDecision: (role) => get(`/decision?role=${role}`),
}
