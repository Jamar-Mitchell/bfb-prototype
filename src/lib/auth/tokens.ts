import { useSessionStore, type SessionEndReason, type SessionUser } from '../../stores/session'
import type { components } from '../api/schema'

export type TokenResponse = components['schemas']['TokenResponse']
export type ApiUser = components['schemas']['UserResponse']

/**
 * Both tokens live in `localStorage`, as AUTHENTICATION.md recommends, so a reload and
 * other tabs stay logged in and tabs can see each other's refreshes.
 */
export const ACCESS_TOKEN_KEY = 'bfb.accessToken'
export const REFRESH_TOKEN_KEY = 'bfb.refreshToken'

export interface StoredTokens {
  accessToken: string | null
  refreshToken: string | null
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable (private mode, blocked site data). The session then lasts for this page only.
  }
}

export function readStoredTokens(): StoredTokens {
  return { accessToken: read(ACCESS_TOKEN_KEY), refreshToken: read(REFRESH_TOKEN_KEY) }
}

export function toSessionUser(user: ApiUser): SessionUser {
  return { id: user.id, email: user.email, displayName: user.display_name, emailVerified: user.email_verified }
}

/**
 * Bumped whenever the session ends. A refresh that started in an earlier generation
 * discards its result, so logging out during a refresh cannot log the user back in.
 */
let generation = 0

export function getSessionGeneration(): number {
  return generation
}

/** Store a login or refresh response: both tokens to storage, access token and user to the session store. */
export function storeSession(tokens: TokenResponse) {
  write(ACCESS_TOKEN_KEY, tokens.access_token)
  write(REFRESH_TOKEN_KEY, tokens.refresh_token)
  useSessionStore.getState().setSession({
    accessToken: tokens.access_token,
    user: toSessionUser(tokens.user),
  })
}

/** Use an access token another tab already stored, without a refresh of our own. */
export function adoptStoredAccessToken(accessToken: string) {
  useSessionStore.getState().setAccessToken(accessToken)
}

/** Forget both tokens and the in-memory session. */
export function clearStoredSession(reason?: SessionEndReason) {
  generation += 1
  write(ACCESS_TOKEN_KEY, null)
  write(REFRESH_TOKEN_KEY, null)
  useSessionStore.getState().clearSession(reason)
}

/** The refresh token was rejected: the user has to log in again. Route guards send them to login. */
export function endExpiredSession() {
  clearStoredSession('expired')
}

/**
 * Follow other tabs: when one logs out, this one does too; when one refreshes,
 * this one uses the new access token. Returns a function that stops watching.
 */
export function syncSessionAcrossTabs(): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.storageArea !== localStorage) return
    if (event.key !== null && event.key !== ACCESS_TOKEN_KEY && event.key !== REFRESH_TOKEN_KEY) return

    const session = useSessionStore.getState()
    if (session.status !== 'authenticated') return

    const { accessToken, refreshToken } = readStoredTokens()

    if (!refreshToken) {
      generation += 1
      session.clearSession('logged-out')
    } else if (accessToken && accessToken !== session.accessToken) {
      session.setAccessToken(accessToken)
    }
  }

  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}
