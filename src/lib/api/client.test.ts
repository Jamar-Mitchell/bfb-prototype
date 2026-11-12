import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { apiErrorBody, mockApi, tokenBody, type MockHandler } from '../../test/mockApi'
import { useSessionStore } from '../../stores/session'
import {
  ACCESS_TOKEN_KEY,
  clearStoredSession,
  onSessionExpired,
  REFRESH_TOKEN_KEY,
  storeSession,
} from '../auth/tokens'
import { REFRESH_LOCK_NAME } from './client'
import { ApiError } from './errors'
import { apiGet, apiPost } from './requests'

const account = { user: tokenBody('', '').user, memberships: [] }

/** /account accepts only `new-access`; /auth/refresh answers with `refreshReply`. */
function server(refreshReply: () => ReturnType<MockHandler>): MockHandler {
  return async ({ method, url, authorization }) => {
    if (method === 'post' && url === '/auth/refresh') return refreshReply()
    if (method === 'get' && url === '/account') {
      return authorization === 'Bearer new-access'
        ? { status: 200, data: account }
        : { status: 401, data: apiErrorBody('access_token_expired') }
    }
    return { status: 404, data: apiErrorBody('not_found') }
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('API client refresh-then-retry', () => {
  let api: ReturnType<typeof mockApi>
  const expired = vi.fn()
  let unsubscribe: () => void

  beforeEach(() => {
    localStorage.clear()
    clearStoredSession()
    storeSession(tokenBody('old-access', 'old-refresh'))
    expired.mockReset()
    unsubscribe = onSessionExpired(expired)
  })

  afterEach(() => {
    api?.restore()
    unsubscribe()
    vi.unstubAllGlobals()
  })

  it('runs one refresh for two requests that fail with 401 at the same time, then retries both', async () => {
    api = mockApi(server(async () => {
      await delay(10)
      return { status: 200, data: tokenBody('new-access', 'new-refresh') }
    }))

    const [first, second] = await Promise.all([apiGet('/account'), apiGet('/account')])

    expect(first).toEqual(account)
    expect(second).toEqual(account)
    expect(api.calls('post', '/auth/refresh')).toHaveLength(1)
    expect(JSON.parse(api.calls('post', '/auth/refresh')[0][0].data)).toEqual({ refresh_token: 'old-refresh' })
    // Two failed attempts and two retries.
    expect(api.calls('get', '/account')).toHaveLength(4)
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('new-access')
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('new-refresh')
    expect(useSessionStore.getState().accessToken).toBe('new-access')
    expect(expired).not.toHaveBeenCalled()
  })

  it('clears the session and asks for login when the refresh token is rejected', async () => {
    api = mockApi(server(() => ({ status: 401, data: apiErrorBody('invalid_refresh_token') })))

    const error = await apiGet('/account').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 401, code: 'access_token_expired' })
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull()
    expect(useSessionStore.getState()).toMatchObject({ accessToken: null, user: null })
    expect(expired).toHaveBeenCalledOnce()
  })

  it.each([
    ['a network error', () => 'network-error' as const, 'network_error'],
    ['a server error', () => ({ status: 503, data: apiErrorBody('internal_error') }), 'internal_error'],
  ])('keeps the session when the refresh fails with %s', async (_label, reply, code) => {
    api = mockApi(server(reply))

    await expect(apiGet('/account')).rejects.toMatchObject({ code })

    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('old-refresh')
    expect(useSessionStore.getState().accessToken).toBe('old-access')
    expect(useSessionStore.getState().user).not.toBeNull()
    expect(expired).not.toHaveBeenCalled()
  })

  it('uses the token another tab stored when this tab’s refresh loses the race (grace window)', async () => {
    api = mockApi(server(() => {
      // The other tab rotated first and stored its tokens.
      localStorage.setItem(ACCESS_TOKEN_KEY, 'new-access')
      localStorage.setItem(REFRESH_TOKEN_KEY, 'newer-refresh')
      return { status: 401, data: apiErrorBody('invalid_refresh_token') }
    }))

    await expect(apiGet('/account')).resolves.toEqual(account)

    expect(useSessionStore.getState().accessToken).toBe('new-access')
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('newer-refresh')
    expect(expired).not.toHaveBeenCalled()
  })

  it('does not refresh when another tab already stored a newer access token', async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, 'new-access')
    api = mockApi(server(() => ({ status: 500 })))

    await expect(apiGet('/account')).resolves.toEqual(account)

    expect(api.calls('post', '/auth/refresh')).toHaveLength(0)
  })

  it('discards a refresh that finishes after the user logged out', async () => {
    api = mockApi(server(async () => {
      clearStoredSession()
      return { status: 200, data: tokenBody('new-access', 'new-refresh') }
    }))

    await expect(apiGet('/account')).rejects.toMatchObject({ status: 401 })

    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull()
    expect(useSessionStore.getState().accessToken).toBeNull()
  })

  it('does not refresh on a 401 from login', async () => {
    api = mockApi(() => ({ status: 401, data: apiErrorBody('invalid_credentials') }))

    await expect(apiPost('/auth/login', { email: 'a@b.co', password: 'x' })).rejects.toMatchObject({
      code: 'invalid_credentials',
    })

    expect(api.adapter).toHaveBeenCalledOnce()
    expect(expired).not.toHaveBeenCalled()
  })

  it('holds a Web Lock around the refresh when the browser supports it', async () => {
    const request = vi.fn((_name: string, task: () => Promise<unknown>) => task())
    vi.stubGlobal('navigator', { ...navigator, locks: { request } })
    api = mockApi(server(() => ({ status: 200, data: tokenBody('new-access', 'new-refresh') })))

    await apiGet('/account')

    expect(request).toHaveBeenCalledOnce()
    expect(request.mock.calls[0][0]).toBe(REFRESH_LOCK_NAME)
  })
})
