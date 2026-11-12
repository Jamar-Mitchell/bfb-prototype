import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiErrorBody, apiMembership, apiUser, mockApi, type MockHandler } from '../../test/mockApi'
import { RESEND_COOLDOWN_MS, resetResendCooldown } from './useResendVerification'

function renderAt(path: string) {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </StrictMode>,
  )
}

function type(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

const heading = (name: string | RegExp) => screen.findByRole('heading', { level: 1, name })

let api: ReturnType<typeof mockApi> | undefined

function serve(handler: MockHandler) {
  api = mockApi(handler)
  return api
}

/** A user who logged in earlier and has not verified their email. */
function logInUnverified() {
  localStorage.setItem(ACCESS_TOKEN_KEY, 'access-1')
  localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1')
  useSessionStore.getState().setSession({
    accessToken: 'access-1',
    user: { id: 'user-1', email: 'founder@example.com', displayName: 'Alex Morgan', emailVerified: false },
  })
}

beforeEach(() => {
  localStorage.clear()
  clearStoredSession()
  resetResendCooldown()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  api?.restore()
  api = undefined
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('verification link', () => {
  it('verifies a valid link once and offers to log in', async () => {
    const { calls } = serve(({ url }) => (url === '/auth/verify-email' ? { status: 204 } : { status: 404, data: apiErrorBody('not_found') }))
    renderAt('/verify-email?token=good-token')

    expect(screen.getByRole('status')).toHaveTextContent('Verifying your email…')
    expect(await heading('Your email is verified')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Log in/ })).toBeInTheDocument()
    // StrictMode runs the effect twice; a link works once, so it is sent once.
    expect(calls('post', '/auth/verify-email')).toHaveLength(1)
    expect(JSON.parse(calls('post', '/auth/verify-email')[0][0].data)).toEqual({ token: 'good-token' })
  })

  it('marks a logged-in user verified so the banner goes away', async () => {
    logInUnverified()
    serve(({ method, url }) => {
      if (method === 'post' && url === '/auth/verify-email') return { status: 204 }
      if (method === 'get' && url === '/account') return { status: 200, data: { user: apiUser({ email_verified: true }), memberships: [apiMembership()] } }
      return { status: 404, data: apiErrorBody('not_found') }
    })
    renderAt('/verify-email?token=good-token')

    expect(await heading('Your email is verified')).toBeInTheDocument()
    expect(useSessionStore.getState().user?.emailVerified).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /Continue to BFB/ }))

    expect(await heading(/Good evening/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Verify your email address' })).not.toBeInTheDocument()
  })

  it('explains an expired link and sends a new one to the address given', async () => {
    const { calls } = serve(({ url }) => {
      if (url === '/auth/verify-email') return { status: 400, data: apiErrorBody('verification_token_expired') }
      if (url === '/auth/resend-verification') return { status: 202 }
      return { status: 404, data: apiErrorBody('not_found') }
    })
    renderAt('/verify-email?token=old-token')

    expect(await heading('This link has expired')).toBeInTheDocument()

    type('Email', 'founder@example.com')
    fireEvent.click(screen.getByRole('button', { name: 'Send a new link' }))

    expect(await screen.findByText(/If founder@example.com needs verifying, we’ve sent a new link/)).toBeInTheDocument()
    expect(JSON.parse(calls('post', '/auth/resend-verification')[0][0].data)).toEqual({ email: 'founder@example.com' })
  })

  it('says a used or replaced link no longer works', async () => {
    serve(() => ({ status: 400, data: apiErrorBody('invalid_verification_token') }))
    renderAt('/verify-email?token=used-token')

    expect(await heading('This link no longer works')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send a new link' })).toBeInTheDocument()
  })

  it('tells a logged-in user whose link was already used that they are verified', async () => {
    logInUnverified()
    serve(({ method, url }) => {
      if (url === '/auth/verify-email') return { status: 400, data: apiErrorBody('invalid_verification_token') }
      if (method === 'get' && url === '/account') return { status: 200, data: { user: apiUser({ email_verified: true }), memberships: [] } }
      return { status: 404, data: apiErrorBody('not_found') }
    })
    renderAt('/verify-email?token=used-token')

    expect(await heading('Your email is already verified')).toBeInTheDocument()
  })

  it('treats a link without a token as not working, without calling the API', async () => {
    const { adapter } = serve(() => ({ status: 204 }))
    renderAt('/verify-email')

    expect(await heading('This link no longer works')).toBeInTheDocument()
    expect(adapter).not.toHaveBeenCalled()
  })
})

describe('resend verification', () => {
  function shellServer(): MockHandler {
    return ({ method, url }) => {
      if (method === 'post' && url === '/auth/resend-verification') return { status: 202 }
      if (method === 'get' && url === '/account') return { status: 200, data: { user: apiUser(), memberships: [apiMembership()] } }
      return { status: 404, data: apiErrorBody('not_found') }
    }
  }

  it('resends from the app-shell banner, then waits before allowing another', async () => {
    logInUnverified()
    const { calls } = serve(shellServer())
    renderAt('/dashboard')

    const banner = await screen.findByRole('region', { name: 'Verify your email address' })
    expect(banner).toHaveTextContent('We sent a link to founder@example.com.')

    vi.useFakeTimers()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resend email' }))
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(screen.getByText('New link sent. Check your inbox.')).toBeInTheDocument()
    expect(JSON.parse(calls('post', '/auth/resend-verification')[0][0].data)).toEqual({ email: 'founder@example.com' })
    const sent = screen.getByRole('button', { name: 'Email sent' })
    expect(sent).toBeDisabled()

    fireEvent.click(sent)
    expect(calls('post', '/auth/resend-verification')).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(RESEND_COOLDOWN_MS - 1000)
    })
    expect(screen.getByRole('button', { name: 'Email sent' })).toBeDisabled()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByRole('button', { name: 'Resend email' })).toBeEnabled()
  })

  it('hides the banner for a verified user', async () => {
    useSessionStore.getState().setSession({
      accessToken: 'access-1',
      user: { id: 'user-1', email: 'founder@example.com', displayName: 'Alex Morgan', emailVerified: true },
    })
    serve(shellServer())
    renderAt('/dashboard')

    expect(await heading(/Good evening/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Verify your email address' })).not.toBeInTheDocument()
  })

  it('resends from the create-business step when the API asks for a verified email', async () => {
    logInUnverified()
    const { calls } = serve(({ method, url }) => {
      if (method === 'get' && url === '/account') return { status: 200, data: { user: apiUser(), memberships: [] } }
      if (method === 'post' && url === '/businesses') return { status: 403, data: apiErrorBody('email_not_verified') }
      if (method === 'post' && url === '/auth/resend-verification') return { status: 202 }
      return { status: 404, data: apiErrorBody('not_found') }
    })
    renderAt('/create-business')

    expect(await heading('Create your business')).toBeInTheDocument()
    type(/Business name/, 'Northstar Digital')
    fireEvent.click(screen.getByRole('button', { name: /Create business/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Verify your email address (founder@example.com)')
    fireEvent.click(screen.getByRole('button', { name: 'Resend email' }))

    expect(await screen.findByText('New link sent. Check your inbox.')).toBeInTheDocument()
    expect(calls('post', '/auth/resend-verification')).toHaveLength(1)
  })
})

describe('forgot password', () => {
  it('opens from the login page with the typed email and confirms without revealing accounts', async () => {
    const { calls } = serve(({ url }) => (url === '/auth/password-reset/request' ? { status: 202 } : { status: 404, data: apiErrorBody('not_found') }))
    renderAt('/login')

    type('Email', 'founder@example.com')
    fireEvent.click(screen.getByRole('link', { name: 'Forgot password?' }))

    expect(await heading('Forgot your password?')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('founder@example.com')
    fireEvent.click(screen.getByRole('button', { name: /Send reset link/ }))

    expect(await heading('Check your email')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('If an account uses founder@example.com, we’ve emailed it a link')
    expect(JSON.parse(calls('post', '/auth/password-reset/request')[0][0].data)).toEqual({ email: 'founder@example.com' })
  })
})

describe('reset password', () => {
  function choosePassword(password: string, confirmation = password) {
    type('New password', password)
    type('Confirm new password', confirmation)
    fireEvent.click(screen.getByRole('button', { name: /Set new password/ }))
  }

  it('sets the new password, clears this browser’s session and sends the user to log in', async () => {
    logInUnverified()
    const { calls } = serve(({ url }) => (url === '/auth/password-reset/confirm' ? { status: 204 } : { status: 404, data: apiErrorBody('not_found') }))
    renderAt('/reset-password?token=reset-token')

    expect(await heading('Choose a new password')).toBeInTheDocument()
    choosePassword('new horse battery 9')

    expect(await heading('Log in to BFB')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Your password was changed. Log in with your new password.')
    expect(JSON.parse(calls('post', '/auth/password-reset/confirm')[0][0].data)).toEqual({
      token: 'reset-token',
      new_password: 'new horse battery 9',
    })
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull()
    expect(useSessionStore.getState()).toMatchObject({ status: 'anonymous', user: null })
  })

  it('shows the rules a weak password breaks and keeps the form', async () => {
    serve(() => ({ status: 422, data: apiErrorBody('weak_password', { rules: ['contains_email'] }) }))
    renderAt('/reset-password?token=reset-token')

    choosePassword('founder horse 9')

    const password = screen.getByLabelText('New password')
    await waitFor(() => expect(password).toHaveAttribute('aria-invalid', 'true'))
    expect(password).toHaveAccessibleDescription(/Don’t include your email address in your password\./)
    expect(screen.getByRole('heading', { level: 1, name: 'Choose a new password' })).toBeInTheDocument()
  })

  it('checks the confirmation before calling the API', async () => {
    const { adapter } = serve(() => ({ status: 204 }))
    renderAt('/reset-password?token=reset-token')

    choosePassword('new horse battery 9', 'new horse battery 8')

    await waitFor(() => expect(screen.getByLabelText('Confirm new password')).toHaveAccessibleDescription('The passwords don’t match.'))
    expect(adapter).not.toHaveBeenCalled()
  })

  it('offers a new link when the reset link has expired', async () => {
    serve(() => ({ status: 400, data: apiErrorBody('password_reset_token_expired') }))
    renderAt('/reset-password?token=old-token')

    choosePassword('new horse battery 9')

    expect(await heading('This link has expired')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: /Request a new link/ }))
    expect(await heading('Forgot your password?')).toBeInTheDocument()
  })

  it('says a used link no longer works', async () => {
    serve(() => ({ status: 400, data: apiErrorBody('invalid_password_reset_token') }))
    renderAt('/reset-password?token=used-token')

    choosePassword('new horse battery 9')

    expect(await heading('This link no longer works')).toBeInTheDocument()
  })
})
