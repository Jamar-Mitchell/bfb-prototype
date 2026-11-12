import { refreshAccessToken, SessionEndedError } from '../api/client'
import { toApiError } from '../api/errors'
import { apiGet, apiPost } from '../api/requests'
import { useSessionStore } from '../../stores/session'
import { clearStoredSession, readStoredTokens, toSessionUser } from './tokens'

let restoring: Promise<void> | null = null

/**
 * On app load, turn a stored refresh token into a live session before protected
 * routes render. Safe to call more than once: only the first call while the
 * session is unknown (or after a failed attempt) does anything.
 */
export function restoreSession(): Promise<void> {
  const session = useSessionStore.getState()
  if (restoring) return restoring
  if (session.status !== 'idle' && session.status !== 'error') return Promise.resolve()

  const stored = readStoredTokens()
  if (!stored.refreshToken) {
    session.clearSession()
    return Promise.resolve()
  }

  session.setRestoring()
  restoring = (async () => {
    try {
      // The stored access token may be up to 15 minutes old: treat it as stale and refresh.
      // If another tab refreshed meanwhile, its token is used instead and the user comes from /account.
      const accessToken = await refreshAccessToken(stored.accessToken)
      const current = useSessionStore.getState()

      if (!current.user) {
        const account = await apiGet('/account')
        current.setSession({ accessToken: useSessionStore.getState().accessToken ?? accessToken, user: toSessionUser(account.user) })
      }
    } catch (error) {
      if (error instanceof SessionEndedError) return // tokens cleared; status is anonymous
      if (useSessionStore.getState().status === 'restoring') {
        useSessionStore.getState().setRestoreError(toApiError(error))
      }
    } finally {
      restoring = null
    }
  })()

  return restoring
}

/**
 * Log out: forget the session locally right away, then end it on the API.
 * A failed logout call is ignored; the refresh token is already gone from this browser.
 */
export async function logout(): Promise<void> {
  const { refreshToken } = readStoredTokens()
  clearStoredSession('logged-out')

  if (refreshToken) {
    await apiPost('/auth/logout', { refresh_token: refreshToken }).catch(() => undefined)
  }
}
