import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiErrorBody, apiUser, mockApi, tokenBody, type MockHandler, type MockReply } from '../../test/mockApi'

const dashboardHeading = { level: 1, name: /Good evening/ } as const

function renderAt(path: string) {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </StrictMode>,
  )
}

/** A browser that was logged in before the reload: tokens in storage, nothing in memory. */
function storeTokensFromLastVisit() {
  localStorage.setItem(ACCESS_TOKEN_KEY, 'stale-access')
  localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1')
}

/** Refresh rotates refresh-1 to refresh-2 unless `refreshReply` says otherwise; login always succeeds. */
function apiServer(refreshReply?: () => MockReply): MockHandler {
  return ({ method, url }) => {
    if (method === 'post' && url === '/auth/refresh') {
      return refreshReply?.() ?? { status: 200, data: tokenBody('access-2', 'refresh-2') }
    }
    if (method === 'post' && url === '/auth/login') return { status: 200, data: tokenBody('access-1', 'refresh-1') }
    if (method === 'post' && url === '/auth/logout') return { status: 204 }
    if (method === 'get' && url === '/account') return { status: 200, data: { user: apiUser(), memberships: [] } }
    return { status: 404, data: apiErrorBody('not_found') }
  }
}

let api: ReturnType<typeof mockApi> | undefined

beforeEach(() => {
  localStorage.clear()
  clearStoredSession()
  // Every test starts as a fresh page load.
  useSessionStore.setState({ status: 'idle', endReason: null })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  api?.restore()
  api = undefined
  vi.restoreAllMocks()
})

describe('session restore on load', () => {
  it('keeps the user logged in across a reload', async () => {
    storeTokensFromLastVisit()
    api = mockApi(apiServer())
    renderAt('/dashboard')

    expect(screen.getByRole('status')).toHaveTextContent('Loading your workspace…')
    expect(await screen.findByRole('heading', dashboardHeading)).toBeInTheDocument()

    // StrictMode runs the restore effect twice; only one refresh goes out.
    expect(api.calls('post', '/auth/refresh')).toHaveLength(1)
    expect(JSON.parse(api.calls('post', '/auth/refresh')[0][0].data)).toEqual({ refresh_token: 'refresh-1' })
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('access-2')
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-2')
    expect(useSessionStore.getState()).toMatchObject({ status: 'authenticated', user: { displayName: 'Alex Morgan' } })
  })

  it('sends the user to log in when the stored session has ended', async () => {
    storeTokensFromLastVisit()
    api = mockApi(apiServer(() => ({ status: 401, data: apiErrorBody('invalid_refresh_token') })))
    renderAt('/exchanges')

    expect(await screen.findByRole('heading', { level: 1, name: 'Log in to BFB' })).toBeInTheDocument()
    expect(screen.getByText('Your session has ended. Log in again to continue.')).toBeInTheDocument()
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull()
  })

  it('keeps the tokens and offers a retry when the API cannot be reached', async () => {
    storeTokensFromLastVisit()
    let reachable = false
    api = mockApi(apiServer(() => (reachable ? { status: 200, data: tokenBody('access-2', 'refresh-2') } : 'network-error')))
    renderAt('/dashboard')

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not reach BFB.')
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-1')

    reachable = true
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', dashboardHeading)).toBeInTheDocument()
  })

  it('does not call the API when nothing is stored', async () => {
    api = mockApi(apiServer())
    renderAt('/')

    expect(screen.getByRole('heading', { level: 1, name: /Exchange what your business does best/ })).toBeInTheDocument()
    expect(useSessionStore.getState().status).toBe('anonymous')
    expect(api.adapter).not.toHaveBeenCalled()
  })
})

describe('protected routes', () => {
  async function logIn() {
    expect(await screen.findByRole('heading', { level: 1, name: 'Log in to BFB' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'founder@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse 1' } })
    fireEvent.click(screen.getByRole('button', { name: /Log in/ }))
  }

  it('sends a logged-out visit to /dashboard to login, then back to /dashboard', async () => {
    api = mockApi(apiServer())
    renderAt('/dashboard')

    await logIn()

    expect(await screen.findByRole('heading', dashboardHeading)).toBeInTheDocument()
  })

  it('returns to the page that was asked for, not just the dashboard', async () => {
    api = mockApi(apiServer())
    renderAt('/exchanges')

    await logIn()

    expect(await screen.findByRole('heading', { level: 1, name: /Keep every trade moving/ })).toBeInTheDocument()
  })

  it('sends a logged-in user away from the login page', async () => {
    storeTokensFromLastVisit()
    api = mockApi(apiServer())
    renderAt('/login')

    expect(await screen.findByRole('heading', dashboardHeading)).toBeInTheDocument()
  })
})

describe('log out', () => {
  it('ends the session on the API, clears it here and shows the login page', async () => {
    storeTokensFromLastVisit()
    api = mockApi(apiServer())
    renderAt('/messages')
    await screen.findByRole('heading', { level: 1, name: /Business conversations/ })

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Log in to BFB' })).toBeInTheDocument()
    expect(screen.getByText('You have logged out.')).toBeInTheDocument()
    expect(JSON.parse(api.calls('post', '/auth/logout')[0][0].data)).toEqual({ refresh_token: 'refresh-2' })
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull()
    expect(useSessionStore.getState()).toMatchObject({ status: 'anonymous', accessToken: null, user: null })
  })

  it('follows a logout in another tab', async () => {
    storeTokensFromLastVisit()
    api = mockApi(apiServer())
    renderAt('/dashboard')
    await screen.findByRole('heading', dashboardHeading)

    act(() => {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      window.dispatchEvent(new StorageEvent('storage', { key: REFRESH_TOKEN_KEY, storageArea: localStorage }))
    })

    expect(await screen.findByRole('heading', { level: 1, name: 'Log in to BFB' })).toBeInTheDocument()
    expect(useSessionStore.getState().accessToken).toBeNull()
  })
})
