const raw = (import.meta.env.VITE_API_URL ?? '/api').trim()

export const API_URL = raw.replace(/\/+$/, '') || '/api'
