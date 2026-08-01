const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api/v1'


export class ApiClientError extends Error {
  status: number
  details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data: T
  details?: unknown
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('sabzi_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...(init.headers || {}),
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  let body: ApiEnvelope<T> | null = null
  try {
    body = (await res.json()) as ApiEnvelope<T>
  } catch {
    body = null
  }

  if (!res.ok || !body?.success) {
    throw new ApiClientError(
      res.status,
      body?.message || res.statusText || 'Request failed',
      body?.details
    )
  }

  return body.data
}

export const apiGet = <T>(path: string) => api<T>(path)
export const apiPost = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) })
export const apiPut = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(body) })
export const apiDelete = <T>(path: string) => api<T>(path, { method: 'DELETE' })
