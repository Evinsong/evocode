import type { ApiResponse } from '@shared/types'

const baseURL: string = import.meta.env.VITE_API_BASE || ''

/**
 * Core request method that handles all HTTP interactions.
 * Automatically adds JSON headers, parses ApiResponse envelope,
 * and throws on non-zero response codes.
 *
 * @param method - HTTP method (GET, POST, PUT, DELETE)
 * @param path - API path (e.g. '/api/tasks')
 * @param body - Optional request body (will be JSON-stringified)
 * @returns The `data` field from the ApiResponse
 * @throws Error if the HTTP request fails or response code !== 0
 */
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${baseURL}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const config: RequestInit = {
    method,
    headers,
  }

  if (body !== undefined) {
    config.body = JSON.stringify(body)
  }

  const response = await fetch(url, config)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const json: ApiResponse<T> = await response.json()

  if (json.code !== 0) {
    throw new Error(json.message || 'API request failed')
  }

  return json.data
}

/**
 * Unified API client with convenience methods for common HTTP verbs.
 * All methods return the `data` field from the ApiResponse envelope.
 */
export const apiClient = {
  request,
  get: <T>(path: string): Promise<T> => request<T>('GET', path),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown): Promise<T> => request<T>('PUT', path, body),
  del: <T>(path: string): Promise<T> => request<T>('DELETE', path),
}
