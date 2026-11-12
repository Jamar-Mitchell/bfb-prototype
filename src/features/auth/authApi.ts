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
