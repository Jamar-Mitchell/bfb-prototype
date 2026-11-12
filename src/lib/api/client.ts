import axios, { type AxiosRequestConfig } from 'axios'

import { env } from '../config/env'
import { useSessionStore } from '../../stores/session'
import {
  adoptStoredAccessToken,
  endExpiredSession,
  getSessionGeneration,
  readStoredTokens,
  storeSession,
  type TokenResponse,
} from '../auth/tokens'
import { toApiError } from './errors'

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Set on the one retry after a refresh, so a second 401 is not refreshed again. */
    _authRetried?: boolean
  }
}

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
})

apiClient.interceptors.request.use((config) => {
  const accessToken = useSessionStore.getState().accessToken

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

/** Their 401s mean wrong credentials or a dead refresh token, never "refresh and retry". */
const AUTH_ROUTES = new Set(['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'])

function isAuthRoute(url: string | undefined): boolean {
  return url !== undefined && AUTH_ROUTES.has(url.split('?')[0])
}

function bearerToken(config: AxiosRequestConfig): string | null {
  const headers = config.headers as { get?: (name: string) => unknown; Authorization?: unknown } | undefined
  const header = typeof headers?.get === 'function' ? headers.get('Authorization') : headers?.Authorization
  return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
}

/** The refresh token was rejected (or is missing): the user has to log in again. */
export class SessionEndedError extends Error {
  constructor() {
    super('The session has ended')
    this.name = 'SessionEndedError'
  }
}

export const REFRESH_LOCK_NAME = 'bfb-auth-refresh'

/** Run `task` while holding a lock shared by every tab, so tabs never refresh at the same time. */
function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks
  return locks ? locks.request(REFRESH_LOCK_NAME, task) : task()
}

async function runRefresh(staleAccessToken: string | null): Promise<string> {
  // Another tab may have refreshed while we waited for the lock.
  const stored = readStoredTokens()

  if (stored.accessToken && stored.accessToken !== staleAccessToken && stored.refreshToken) {
    adoptStoredAccessToken(stored.accessToken)
    return stored.accessToken
  }

  if (!stored.refreshToken) {
    endExpiredSession()
    throw new SessionEndedError()
  }

  const generation = getSessionGeneration()
  let tokens: TokenResponse

  try {
    const response = await apiClient.post<TokenResponse>('/auth/refresh', { refresh_token: stored.refreshToken })
    tokens = response.data
  } catch (error) {
    const apiError = toApiError(error)

    if (apiError.status !== 401) {
      // Network error or 5xx: keep the tokens, the user is still logged in.
      throw apiError
    }

    // Grace window: another tab may have rotated the token just before us.
    const latest = readStoredTokens()
    if (latest.accessToken && latest.accessToken !== stored.accessToken && latest.refreshToken) {
      adoptStoredAccessToken(latest.accessToken)
      return latest.accessToken
    }

    endExpiredSession()
    throw new SessionEndedError()
  }

  // The user logged out while the refresh was in flight: drop the result.
  if (generation !== getSessionGeneration()) {
    throw new SessionEndedError()
  }

  storeSession(tokens)
  return tokens.access_token
}

let refreshInFlight: Promise<string> | null = null

/**
 * Get a fresh access token. One refresh at a time per tab (callers share the
 * in-flight one) and across tabs (Web Locks, where the browser supports them).
 *
 * `staleAccessToken` is the token the caller knows is no good. If storage holds a
 * different one, another tab already refreshed and that token is used as is.
 *
 * Rejects with `SessionEndedError` when the session is over (tokens are cleared),
 * or with an `ApiError` for network and server failures (tokens are kept).
 */
export function refreshAccessToken(staleAccessToken: string | null): Promise<string> {
  refreshInFlight ??= withRefreshLock(() => runRefresh(staleAccessToken)).finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      error.config &&
      !error.config._authRetried &&
      !isAuthRoute(error.config.url)
    ) {
      const config = error.config

      try {
        await refreshAccessToken(bearerToken(config))
      } catch (refreshError) {
        // Session over: report the original 401. Transient failure: report that instead.
        return Promise.reject(refreshError instanceof SessionEndedError ? toApiError(error) : toApiError(refreshError))
      }

      // The request interceptor puts the new access token on the retry.
      return apiClient.request({ ...config, _authRetried: true })
    }

    // Every failed call rejects with an ApiError, so callers never handle raw Axios errors.
    return Promise.reject(toApiError(error))
  },
)
