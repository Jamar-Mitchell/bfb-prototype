import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiErrorBody, apiMembership, apiUser, mockApi, tokenBody, type MockHandler } from '../../test/mockApi'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

function type(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

let api: ReturnType<typeof mockApi> | undefined

function serve(handler: MockHandler) {
  api = mockApi(handler)
  return api
}

beforeEach(() => {
  localStorage.clear()
  clearStoredSession()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  api?.restore()
  api = undefined
  vi.restoreAllMocks()
})

describe('login', () => {
  it('logs in, stores the session and opens the dashboard', async () => {
    const { calls } = serve(({ url }) =>
      url === '/auth/login'
        ? { status: 200, data: tokenBody('access-1', 'refresh-1') }
        : url === '/account'
          ? { status: 200, data: { user: apiUser(), memberships: [apiMembership()] } }
          : { status: 404, data: apiErrorBody('not_found') },
    )
    renderAt('/login')

    type('Email', 'founder@example.com')
    type('Password', 'correct horse 1')
    fireEvent.click(screen.getByRole('button', { name: /Log in/ }))

    expect(await screen.findByRole('heading', { level: 1, name: /Good evening/ })).toBeInTheDocument()
    expect(JSON.parse(calls('post', '/auth/login')[0][0].data)).toEqual({
      email: 'founder@example.com',
      password: 'correct horse 1',
    })
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('access-1')
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-1')
    expect(useSessionStore.getState().user).toEqual({
      id: 'user-1',
      email: 'founder@example.com',
      displayName: 'Alex Morgan',
      emailVerified: false,
    })
  })

  it('shows one message for wrong credentials and stays logged out', async () => {
    serve(() => ({ status: 401, data: apiErrorBody('invalid_credentials') }))
    renderAt('/login')

    type('Email', 'founder@example.com')
    type('Password', 'wrong password 1')
    fireEvent.click(screen.getByRole('button', { name: /Log in/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That email and password don’t match.')
    expect(screen.getByRole('heading', { level: 1, name: 'Log in to BFB' })).toBeInTheDocument()
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull()
    expect(useSessionStore.getState().accessToken).toBeNull()
  })

  it('checks the fields before calling the API', async () => {
    const { adapter } = serve(() => ({ status: 500 }))
    renderAt('/login')

    fireEvent.click(screen.getByRole('button', { name: /Log in/ }))

    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter a valid email address.'))
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Enter your password.')
    expect(adapter).not.toHaveBeenCalled()
  })
})

describe('registration', () => {
  function fillRegistration() {
    type('Your name', 'Alex Morgan')
    type('Email', 'founder@example.com')
    type('Password', 'correct horse 1')
    fireEvent.click(screen.getByRole('checkbox', { name: /Terms of Service/ }))
    fireEvent.click(screen.getByRole('button', { name: /Create account/ }))
  }

  it('creates the account and sends the user to log in', async () => {
    const { calls } = serve(() => ({ status: 201, data: apiUser() }))
    renderAt('/register')

    fillRegistration()

    expect(await screen.findByRole('heading', { level: 1, name: 'Log in to BFB' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Your account was created. Log in to continue.')
    expect(screen.getByLabelText('Email')).toHaveValue('founder@example.com')
    expect(JSON.parse(calls('post', '/auth/register')[0][0].data)).toEqual({
      display_name: 'Alex Morgan',
      email: 'founder@example.com',
      password: 'correct horse 1',
      accept_terms: true,
    })
    // Registration does not log in.
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull()
  })

  it('shows a duplicate email on the email field', async () => {
    serve(() => ({ status: 409, data: apiErrorBody('email_already_registered') }))
    renderAt('/register')

    fillRegistration()

    const email = screen.getByLabelText('Email')
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'))
    expect(email).toHaveAccessibleDescription('An account with this email already exists. Log in instead.')
    expect(email).toHaveFocus()
    expect(screen.getByRole('heading', { level: 1, name: 'Create your account' })).toBeInTheDocument()
  })

  it('explains a password the API rejects', async () => {
    serve(() => ({ status: 422, data: apiErrorBody('weak_password', { rules: ['contains_email'] }) }))
    renderAt('/register')

    fillRegistration()

    const password = screen.getByLabelText('Password')
    await waitFor(() => expect(password).toHaveAttribute('aria-invalid', 'true'))
    expect(password).toHaveAccessibleDescription(/Don’t include your email address in your password\./)
  })

  it('requires accepting the terms', async () => {
    const { adapter } = serve(() => ({ status: 201, data: apiUser() }))
    renderAt('/register')

    type('Your name', 'Alex Morgan')
    type('Email', 'founder@example.com')
    type('Password', 'correct horse 1')
    fireEvent.click(screen.getByRole('button', { name: /Create account/ }))

    const checkbox = screen.getByRole('checkbox', { name: /Terms of Service/ })
    await waitFor(() => expect(checkbox).toHaveAttribute('aria-invalid', 'true'))
    expect(checkbox).toHaveAccessibleDescription('Accept the Terms of Service and Privacy Policy to continue.')
    expect(adapter).not.toHaveBeenCalled()
  })
})

describe('invite code at registration', () => {
  function submitRegistration() {
    type('Your name', 'Alex Morgan')
    type('Email', 'founder@example.com')
    type('Password', 'correct horse 1')
    fireEvent.click(screen.getByRole('checkbox', { name: /Terms of Service/ }))
    fireEvent.click(screen.getByRole('button', { name: /Create account/ }))
  }

  it('sends a valid code with the registration', async () => {
    const { calls } = serve(() => ({ status: 201, data: apiUser() }))
    renderAt('/register')

    type('Invite code', '  K7QM-3XRP ')
    submitRegistration()

    expect(await screen.findByRole('heading', { level: 1, name: 'Log in to BFB' })).toBeInTheDocument()
    expect(JSON.parse(calls('post', '/auth/register')[0][0].data)).toMatchObject({
      email: 'founder@example.com',
      invite_code: 'K7QM-3XRP',
    })
  })

  it('prefills the code from an invite link', async () => {
    const { calls } = serve(() => ({ status: 201, data: apiUser() }))
    renderAt('/register?code=spring-pilot')

    expect(screen.getByLabelText('Invite code')).toHaveValue('spring-pilot')
    submitRegistration()

    await screen.findByRole('heading', { level: 1, name: 'Log in to BFB' })
    // The API matches codes case-insensitively, so the code is sent as given.
    expect(JSON.parse(calls('post', '/auth/register')[0][0].data)).toMatchObject({ invite_code: 'spring-pilot' })
  })

  it('leaves the code out when the field is empty', async () => {
    const { calls } = serve(() => ({ status: 201, data: apiUser() }))
    renderAt('/register')

    submitRegistration()

    await screen.findByRole('heading', { level: 1, name: 'Log in to BFB' })
    expect(JSON.parse(calls('post', '/auth/register')[0][0].data)).not.toHaveProperty('invite_code')
  })

  it.each([
    ['invalid_invite_code', 'We don’t recognise that invite code. Check it and try again.'],
    ['invite_code_required', 'BFB is invite-only during the pilot. Enter your invite code.'],
    ['invite_code_expired', 'That invite code has expired. Ask the person who sent it for a new one.'],
    ['invite_code_exhausted', 'That invite code has been used up. Ask the person who sent it for a new one.'],
  ])('shows %s on the invite-code field', async (code, message) => {
    serve(() => ({ status: 422, data: apiErrorBody(code) }))
    renderAt('/register?code=NOPE-0000')

    submitRegistration()

    const field = screen.getByLabelText('Invite code')
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'))
    expect(field).toHaveAccessibleDescription(new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    expect(field).toHaveFocus()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Create your account' })).toBeInTheDocument()
  })
})

describe('landing page', () => {
  it('opens login from "Sign in" and registration from "Get started"', () => {
    renderAt('/')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Log in to BFB' })).toBeInTheDocument()

    cleanup()
    renderAt('/')
    fireEvent.click(screen.getByRole('button', { name: /Get started/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'Create your account' })).toBeInTheDocument()
  })
})
