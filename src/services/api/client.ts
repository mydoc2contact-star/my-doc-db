import type { ApiEnvelope } from '@/types'
import { API_URL } from './config'
import { ApiError } from './errors'
import { clearToken, getToken } from './token'

export type QueryParams = Record<string, string | number | boolean | undefined | null>

interface RequestOptions {
  params?: QueryParams
  body?: unknown
  signal?: AbortSignal
  anonymous?: boolean
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

function buildUrl(path: string, params?: QueryParams): string {
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`
  if (!params) return url

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.append(key, String(value))
  }
  const query = search.toString()
  return query ? `${url}?${query}` : url
}

async function request<T>(method: Method, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (options.body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  if (!options.anonymous) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.params), {
      method,
      headers,
      signal: options.signal,
      body:
        options.body === undefined
          ? undefined
          : isForm
            ? (options.body as FormData)
            : JSON.stringify(options.body),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('تعذر الاتصال بالخادم. تأكد أن خادم MyDoc يعمل.', 0)
  }

  const raw = await response.text()
  let payload: unknown = null
  if (raw) {
    try {
      payload = JSON.parse(raw)
    } catch {
      payload = null
    }
  }

  const envelope = payload as Partial<ApiEnvelope<T>> | null

  if (!response.ok) {
    if (response.status === 401) {
      clearToken()
      onUnauthorized?.()
    }
    const fallback =
      response.status === 502 || response.status === 503 || response.status === 504 || !raw
        ? 'خادم MyDoc غير متصل. تأكد أن الـ Backend يعمل ثم أعد المحاولة.'
        : 'فشل الطلب'
    throw new ApiError(envelope?.message ?? fallback, response.status)
  }

  if (envelope && typeof envelope === 'object' && 'data' in envelope) {
    if (envelope.success === false) {
      throw new ApiError(envelope.message ?? 'فشل الطلب', response.status)
    }
    return envelope.data as T
  }

  return payload as T
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
}
