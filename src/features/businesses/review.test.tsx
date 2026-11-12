import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { useToastStore } from '../../components/feedback'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiErrorBody, apiMembership, apiUser, mockApi, tokenBody, type MockHandler, type MockReply } from '../../test/mockApi'
import { answeredProfile, apiCategories, emptyPortfolio, profileBusiness } from '../../test/profileServer'
import type { Business } from './profileApi'

const complete = { ...answeredProfile, logo_upload_id: 'logo-1' }
const dashboardHeading = { level: 1, name: /Good evening/ } as const
const profileHeading = { level: 1, name: /Show partners what makes you valuable/ } as const

interface ServerOptions {
  business: Business
  reply?: (request: { method: string; url: string }) => MockReply | undefined
}

function apiServer({ business: initial, reply }: ServerOptions) {
  const server = { business: initial }
  const handler: MockHandler = ({ method, url }) => {
    const custom = reply?.({ method, url })
    if (custom) return custom

    const user = apiUser({ email_verified: true })
    if (method === 'post' && url === '/auth/refresh') return { status: 200, data: { ...tokenBody('access-2', 'refresh-2'), user } }
    if (method === 'get' && url === '/account') return { status: 200, data: { user, memberships: [apiMembership({ role: server.business.role })] } }
    if (method === 'get' && url === '/categories') return { status: 200, data: apiCategories }
    if (method === 'get' && url === '/businesses/business-1') return { status: 200, data: server.business }
    if (method === 'get' && url === '/businesses/business-1/portfolio') return { status: 200, data: emptyPortfolio }
    if (method === 'post' && url === '/businesses/business-1/submit-for-review') {
      server.business = { ...server.business, profile_status: 'in_review', verification_status: 'pending', submitted_for_review_at: '2026-11-12T12:00:00Z' }
      return { status: 200, data: server.business }
    }
    if (method === 'get' && url.startsWith('/businesses/business-1/uploads/')) return { status: 404, data: apiErrorBody('not_found') }
    return { status: 404, data: apiErrorBody('not_found') }
  }
  return { server, handler }
}

let api: ReturnType<typeof mockApi> | undefined

function open(path: string, options: ServerOptions) {
  localStorage.setItem(ACCESS_TOKEN_KEY, 'stale-access')
  localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1')
  const { server, handler } = apiServer(options)
  api = mockApi(handler)
  const view = render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </StrictMode>,
  )
  return { server, view }
}

async function openProfile(options: ServerOptions) {
  const opened = open('/profile', options)
  await screen.findByRole('heading', profileHeading)
  await screen.findByRole('list', { name: 'Required details' })
  return opened
}

const submitButton = () => screen.queryByRole('button', { name: /Submit for review|Submit again/ })

beforeEach(() => {
  localStorage.clear()
  clearStoredSession()
  useSessionStore.setState({ status: 'idle', endReason: null })
  useToastStore.setState({ toasts: [] })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  api?.restore()
  api = undefined
  vi.restoreAllMocks()
})

describe('submit for review', () => {
  it('is offered only once the profile is complete', async () => {
    await openProfile({ business: profileBusiness(answeredProfile) })

    expect(screen.getByText('89%')).toBeInTheDocument()
    expect(submitButton()).toBeNull()
  })

  it('submits a complete draft and locks the profile', async () => {
    const { server } = await openProfile({ business: profileBusiness(complete) })

    fireEvent.click(screen.getByRole('button', { name: /Submit for review/ }))

    const banner = await screen.findByRole('region', { name: 'Profile in review' })
    expect(banner).toHaveTextContent('Your profile is in review.')
    expect(api!.calls('post', '/businesses/business-1/submit-for-review')).toHaveLength(1)
    expect(server.business.profile_status).toBe('in_review')
    expect(useToastStore.getState().toasts.map((toast) => toast.message)).toContain('Your profile was submitted for review.')
    expect(submitButton()).toBeNull()
    expect(screen.queryByRole('button', { name: /Edit profile/ })).toBeNull()
    expect(screen.getByText('Editing is paused while your profile is in review.')).toBeInTheDocument()
  })

  it('waits for unsaved edits', async () => {
    await openProfile({ business: profileBusiness(complete) })

    fireEvent.click(screen.getByRole('button', { name: /Edit profile/ }))

    expect(screen.getByRole('button', { name: /Submit for review/ })).toBeDisabled()
    expect(screen.getByText('Save or cancel your changes first.')).toBeInTheDocument()
  })

  it('lists what the API says is still missing', async () => {
    let refused = false
    await openProfile({
      business: profileBusiness(complete),
      reply: ({ method, url }) => {
        if (method === 'post' && url.endsWith('/submit-for-review')) {
          refused = true
          return { status: 422, data: apiErrorBody('profile_incomplete', { missing: ['logo'] }) }
        }
        if (refused && method === 'get' && url === '/businesses/business-1') {
          return { status: 200, data: profileBusiness(answeredProfile) }
        }
        return undefined
      },
    })

    fireEvent.click(screen.getByRole('button', { name: /Submit for review/ }))

    // The page reloads the profile, which is no longer complete: the button goes away.
    expect(await screen.findByText('89%')).toBeInTheDocument()
    expect(submitButton()).toBeNull()
  })

  it('offers to submit again after changes were requested', async () => {
    await openProfile({
      business: profileBusiness({
        ...complete,
        profile_status: 'changes_requested',
        latest_review: { decision: 'changes_requested', notes: 'Add your registered legal name.', decided_at: '2026-11-12T13:00:00Z' },
      }),
    })

    expect(screen.getByRole('button', { name: /Submit again/ })).toBeEnabled()
  })

  it('is not offered to members, in review or once approved', async () => {
    await openProfile({ business: profileBusiness({ ...complete, role: 'member' }) })
    expect(submitButton()).toBeNull()
    cleanup()
    api?.restore()

    await openProfile({ business: profileBusiness({ ...complete, profile_status: 'approved' }) })
    expect(submitButton()).toBeNull()
  })
})

describe('status banner', () => {
  it('shows nothing for a draft', async () => {
    open('/dashboard', { business: profileBusiness(complete) })
    await screen.findByText(/ready to submit for review/)

    expect(screen.queryByRole('region', { name: /review|approved|changes|suspended/i })).toBeNull()
  })

  it('says the profile is in review', async () => {
    open('/dashboard', { business: profileBusiness({ ...complete, profile_status: 'in_review', submitted_for_review_at: '2026-11-10T12:00:00Z' }) })

    const banner = await screen.findByRole('region', { name: 'Profile in review' })
    expect(banner).toHaveTextContent('Submitted Nov 10, 2026.')
  })

  it('shows the reviewer’s notes when changes are requested, with a way to the profile', async () => {
    open('/dashboard', {
      business: profileBusiness({
        ...complete,
        profile_status: 'changes_requested',
        latest_review: { decision: 'changes_requested', notes: 'Add your registered legal name.', decided_at: '2026-11-12T13:00:00Z' },
      }),
    })

    const banner = await screen.findByRole('region', { name: 'Changes requested' })
    expect(within(banner).getByText('Add your registered legal name.')).toBeInTheDocument()

    fireEvent.click(within(banner).getByRole('button', { name: 'Edit profile' }))
    expect(await screen.findByRole('heading', profileHeading)).toBeInTheDocument()
    // On the profile page itself the banner keeps the notes but drops its button.
    expect(within(screen.getByRole('region', { name: 'Changes requested' })).queryByRole('button')).toBeNull()
  })

  it('celebrates approval until dismissed', async () => {
    const approved = profileBusiness({
      ...complete,
      profile_status: 'approved',
      verification_status: 'verified',
      latest_review: { decision: 'approved', notes: 'Welcome aboard.', decided_at: '2026-11-12T14:00:00Z' },
    })
    open('/dashboard', { business: approved })

    const banner = await screen.findByRole('region', { name: 'Profile approved' })
    expect(banner).toHaveTextContent('Northstar Digital is approved.')
    expect(banner).toHaveTextContent('Welcome aboard.')
    await screen.findByRole('heading', dashboardHeading)

    fireEvent.click(within(banner).getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('region', { name: 'Profile approved' })).toBeNull()

    cleanup()
    api?.restore()
    open('/dashboard', { business: approved })
    await screen.findByText(/profile is approved and visible/)
    expect(screen.queryByRole('region', { name: 'Profile approved' })).toBeNull()
  })

  it('says when the business is suspended', async () => {
    open('/dashboard', { business: profileBusiness({ ...complete, profile_status: 'suspended' }) })

    expect(await screen.findByRole('region', { name: 'Business suspended' })).toHaveTextContent('Contact BFB support')
  })
})
