import { useSessionStore, type SessionUser } from '../../stores/session'
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
  return { id: user.id, email: user.email, displayName: user.display_name }
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
export function clearStoredSession() {
  generation += 1
  write(ACCESS_TOKEN_KEY, null)
  write(REFRESH_TOKEN_KEY, null)
  useSessionStore.getState().clearSession()
}

type Listener = () => void
const expiredListeners = new Set<Listener>()

/** Called when the API ends the session (refresh rejected). Returns an unsubscribe function. */
export function onSessionExpired(listener: Listener): () => void {
  expiredListeners.add(listener)
  return () => {
    expiredListeners.delete(listener)
  }
}

/** The refresh token was rejected: clear everything and tell the app to send the user to log in. */
export function endExpiredSession() {
  clearStoredSession()
  expiredListeners.forEach((listener) => listener())
}
