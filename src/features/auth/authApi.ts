import { toApiError } from '../../lib/api/errors'
import type { components } from '../../lib/api/schema'
import { apiPost } from '../../lib/api/requests'
import { storeSession } from '../../lib/auth/tokens'

export type RegisterRequest = components['schemas']['RegisterRequest']
export type LoginRequest = components['schemas']['LoginRequest']

/** Create an account. The API returns the new user but no tokens: the user logs in next. */
export function register(body: RegisterRequest) {
  return apiPost('/auth/register', body)
}

/** Log in and store the session (tokens in storage, user in the session store). */
export async function login(body: LoginRequest) {
  const tokens = await apiPost('/auth/login', body)
  storeSession(tokens)
  return tokens.user
}

// A verification link works once. React's StrictMode (and a remount) would run the page's
// effect twice, so each token is sent to the API once per page load and the result shared.
const verifications = new Map<string, Promise<void>>()

/** Verify an email address with the token from the emailed link. Needs no access token. */
export function verifyEmail(token: string): Promise<void> {
  let pending = verifications.get(token)
  if (!pending) {
    pending = apiPost('/auth/verify-email', { token }).then(() => undefined)
    // A request that never got a definite answer (offline, 5xx) may be retried.
    pending.catch((error) => {
      const { status } = toApiError(error)
      if (status === undefined || status >= 500) verifications.delete(token)
    })
    verifications.set(token, pending)
  }
  return pending
}

/** Email a new verification link. The API always answers 202, whether or not the address needs one. */
export async function resendVerification(email: string): Promise<void> {
  await apiPost('/auth/resend-verification', { email })
}

/** Email a password reset link. The API always answers 202, whether or not the address is registered. */
export async function requestPasswordReset(email: string): Promise<void> {
  await apiPost('/auth/password-reset/request', { email })
}

/** Set a new password with the token from the emailed link. Ends every session the user has. */
export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  await apiPost('/auth/password-reset/confirm', { token, new_password: newPassword })
}
