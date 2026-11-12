import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { useToastStore } from '../../components/feedback'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiErrorBody, apiMembership, apiUser, mockApi, tokenBody, type MockHandler, type MockReply, type MockRequest } from '../../test/mockApi'
import type { AdminBusiness, ReviewQueueItem } from './adminApi'

type PlatformRole = 'user' | 'support' | 'administrator'

const BUSINESS_ID = '6a1f2c3d-1111-4a2b-9c3d-0123456789ab'

const category = (id: string, name: string, requiresReview = false) => ({ id, slug: id, name, requires_review: requiresReview })
const branding = category('cat-branding', 'Branding & design')
const legal = category('cat-legal', 'Legal & compliance', true)

function queueItem(overrides: Partial<ReviewQueueItem> = {}): ReviewQueueItem {
  return {
    id: BUSINESS_ID,
    display_name: 'Northside Studio',
    legal_name: 'Northside Studio LLC',
    profile_status: 'in_review',
    verification_status: 'pending',
    submitted_for_review_at: '2026-11-12T12:00:00Z',
    completeness: { score: 100, complete: true, missing: [] },
    categories: [branding],
    flagged_categories: [],
    requires_additional_review: false,
    latest_review: null,
    ...overrides,
  }
}

function adminBusiness(overrides: Partial<AdminBusiness> = {}): AdminBusiness {
  return {
    id: BUSINESS_ID,
    display_name: 'Northside Studio',
    legal_name: 'Northside Studio LLC',
    profile_status: 'in_review',
    verification_status: 'pending',
    description: 'Brand identity for neighbourhood businesses.',
    website_url: 'https://northside.example',
    social_links: { instagram: 'https://instagram.com/northside' },
    location_city: 'Detroit',
    location_region: 'MI',
    location_country: 'US',
    service_area: 'regional',
    industry: 'Design',
    business_stage: 'growing',
    team_size: '2_10',
    categories: [branding, legal],
    logo_upload_id: 'upload-1',
    cover_upload_id: null,
    logo_url: 'http://api.test/logo.png?signature=x',
    cover_url: null,
    completeness: { score: 100, complete: true, missing: [] },
    submitted_for_review_at: '2026-11-12T12:00:00Z',
    flagged_categories: [legal],
    requires_additional_review: true,
    members: [{ user_id: 'owner-1', email: 'owner@northside.example', display_name: 'Jordan Reed', role: 'owner' }],
    offer_counts: { draft: 2, active: 0, paused: 0, archived: 1 },
    need_counts: { draft: 1, active: 0, paused: 0, archived: 0 },
    reviews: [{ id: 'review-1', decision: 'changes_requested', notes: 'Add your registered legal name.', reviewer_user_id: 'admin-1', created_at: '2026-11-10T09:00:00Z' }],
    portfolio: [],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-12T12:00:00Z',
    ...overrides,
  }
}

interface ServerOptions {
  platformRole?: PlatformRole
  memberships?: ReturnType<typeof apiMembership>[]
  queue?: ReviewQueueItem[]
  total?: number
  reply?: (request: MockRequest) => MockReply | undefined
}

function apiServer({ platformRole = 'administrator', memberships = [apiMembership()], queue = [queueItem()], total, reply }: ServerOptions = {}): MockHandler {
  const user = apiUser({ email_verified: true, platform_role: platformRole })
  return (request) => {
    const custom = reply?.(request)
    if (custom) return custom
    const { method, url, config } = request
    if (method === 'post' && url === '/auth/refresh') return { status: 200, data: { ...tokenBody('access-2', 'refresh-2'), user } }
    if (method === 'get' && url === '/account') return { status: 200, data: { user, memberships } }
    if (platformRole === 'user' && url.startsWith('/admin/')) return { status: 403, data: apiErrorBody('forbidden') }
    if (method === 'get' && url === '/admin/reviews') {
      const { limit = 20, offset = 0 } = (config.params ?? {}) as { limit?: number; offset?: number }
      return { status: 200, data: { items: queue.slice(offset, offset + limit), total: total ?? queue.length, limit, offset } }
    }
    if (method === 'get' && url === `/admin/businesses/${BUSINESS_ID}`) return { status: 200, data: adminBusiness() }
    if (method === 'post' && url === `/admin/businesses/${BUSINESS_ID}/approve`) {
      return { status: 200, data: adminBusiness({ profile_status: 'approved', verification_status: 'verified' }) }
    }
    if (method === 'post' && url === `/admin/businesses/${BUSINESS_ID}/request-changes`) {
      return { status: 200, data: adminBusiness({ profile_status: 'changes_requested', verification_status: 'unverified' }) }
    }
    return { status: 404, data: apiErrorBody('not_found') }
  }
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const queueHeading = { level: 1, name: 'Businesses waiting for review.' } as const
const dashboardHeading = { level: 1, name: /Good evening/ } as const

let api: ReturnType<typeof mockApi> | undefined

function openAt(path: string, options: ServerOptions = {}) {
  localStorage.setItem(ACCESS_TOKEN_KEY, 'stale-access')
  localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1')
  api = mockApi(apiServer(options))
  return renderAt(path)
}

function adminCalls() {
  return api!.adapter.mock.calls.filter(([config]) => config.url?.startsWith('/admin/'))
}

async function openDetail(options: ServerOptions = {}) {
  openAt('/admin', options)
  fireEvent.click(await screen.findByRole('link', { name: 'Review Northside Studio' }))
  return screen.findByRole('heading', { level: 1, name: 'Northside Studio' })
}

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

describe('admin access', () => {
  it.each(['/admin', `/admin/businesses/${BUSINESS_ID}`])('sends a regular user from %s to the dashboard', async (path) => {
    openAt(path, { platformRole: 'user' })

    expect(await screen.findByRole('heading', dashboardHeading)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Review queue/ })).not.toBeInTheDocument()
    expect(adminCalls()).toHaveLength(0)
  })

  it('sends a logged-out visitor to log in', async () => {
    api = mockApi(apiServer())
    renderAt('/admin')

    expect(await screen.findByRole('heading', { level: 1, name: 'Log in to BFB' })).toBeInTheDocument()
    expect(adminCalls()).toHaveLength(0)
  })

  it.each<PlatformRole>(['support', 'administrator'])('lets %s users in and shows the admin nav', async (platformRole) => {
    openAt('/dashboard', { platformRole })

    await screen.findByRole('heading', dashboardHeading)
    fireEvent.click(screen.getByRole('button', { name: /Review queue/ }))
    expect(await screen.findByRole('heading', queueHeading)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Review queue/ })).toHaveClass('active')
  })

  it('takes staff without a business to the admin area instead of the create-business step', async () => {
    openAt('/dashboard', { memberships: [] })

    expect(await screen.findByRole('heading', queueHeading)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create a business/ })).toBeInTheDocument()
  })
})

describe('review queue', () => {
  it('lists businesses in review with flagged categories', async () => {
    openAt('/admin', {
      queue: [
        queueItem(),
        queueItem({ id: 'b-2', display_name: 'Counsel Co', legal_name: null, categories: [legal], flagged_categories: [legal], requires_additional_review: true, completeness: { score: 100, complete: true, missing: [] } }),
      ],
    })

    await screen.findByRole('heading', queueHeading)
    const rows = within(await screen.findByRole('region', { name: 'In review' })).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Northside Studio LLC')).toBeInTheDocument()
    expect(within(rows[0]).queryByText('Needs extra review')).not.toBeInTheDocument()
    expect(within(rows[1]).getByText('Needs extra review')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Legal & compliance')).toHaveClass('admin-tag-flagged')
    expect(screen.getByText('2 businesses waiting')).toBeInTheDocument()
    expect(api!.calls('get', '/admin/reviews')[0][0].params).toEqual({ status: 'in_review', limit: 20, offset: 0 })
  })

  it('pages through a long queue', async () => {
    const queue = Array.from({ length: 45 }, (_, index) => queueItem({ id: `b-${index}`, display_name: `Business ${index + 1}` }))
    openAt('/admin', { queue })

    expect(await screen.findByText('Showing 1–20 of 45')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /Next/ }))

    expect(await screen.findByText('Showing 21–40 of 45')).toBeInTheDocument()
    expect(screen.getByText('Business 21')).toBeInTheDocument()
    expect(api!.calls('get', '/admin/reviews').at(-1)![0].params).toMatchObject({ offset: 20 })
    fireEvent.click(screen.getByRole('button', { name: /Next/ }))
    expect(await screen.findByText('Showing 41–45 of 45')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled()
  })

  it('shows an empty state when nothing is waiting', async () => {
    openAt('/admin', { queue: [] })

    expect(await screen.findByRole('heading', { name: 'No businesses waiting for review' })).toBeInTheDocument()
  })

  it('shows an error with a retry', async () => {
    let fail = true
    openAt('/admin', { reply: ({ url }) => (url === '/admin/reviews' && fail ? { status: 500, data: apiErrorBody('internal_error') } : undefined) })

    expect(await screen.findByRole('heading', { name: 'We couldn’t load the review queue' })).toBeInTheDocument()
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Northside Studio')).toBeInTheDocument()
  })
})

describe('business review', () => {
  it('shows the profile, members, listing counts and review history', async () => {
    await openDetail()

    expect(screen.getByText('Northside Studio LLC')).toBeInTheDocument()
    expect(screen.getByText('Needs extra review')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Northside Studio logo' })).toHaveAttribute('src', 'http://api.test/logo.png?signature=x')
    expect(screen.getByText('Brand identity for neighbourhood businesses.')).toBeInTheDocument()
    const members = screen.getByRole('region', { name: 'Members' })
    expect(within(members).getByText('owner@northside.example')).toBeInTheDocument()
    expect(within(members).getByText('Owner')).toBeInTheDocument()
    const offers = within(screen.getByRole('table')).getByRole('row', { name: /Offers/ })
    expect(within(offers).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['2', '0', '0', '1'])
    const history = screen.getByRole('region', { name: 'Review history' })
    expect(within(history).getByText('Add your registered legal name.')).toBeInTheDocument()
  })

  it('shows the portfolio read-only, with PDFs as file tiles', async () => {
    const file = (type: string, name: string) => ({ content_type: type, url: `http://api.test/${name}?signature=x`, url_expires_at: '2026-11-12T12:15:00Z' })
    const item = (id: string, title: string, extra: Partial<AdminBusiness['portfolio'][number]>) => ({
      id, title, description: null, link_url: null, file: null, position: 0, upload_id: null, original_filename: null,
      created_at: '2026-11-12T12:00:00Z', updated_at: '2026-11-12T12:00:00Z', ...extra,
    })
    const portfolio = [
      item('item-1', 'Bakery identity', { file: file('image/png', 'bakery.png'), upload_id: 'upload-2' }),
      item('item-2', 'Case study', { file: file('application/pdf', 'case.pdf'), upload_id: 'upload-3' }),
    ]
    await openDetail({
      reply: ({ method, url }) => (method === 'get' && url === `/admin/businesses/${BUSINESS_ID}` ? { status: 200, data: adminBusiness({ portfolio }) } : undefined),
    })

    const section = screen.getByRole('region', { name: 'Portfolio' })
    expect(within(section).getByText('2 work samples')).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: 'View image: Bakery identity' })).toHaveAttribute('href', 'http://api.test/bakery.png?signature=x')
    expect(within(section).getByRole('link', { name: 'Open PDF: Case study' })).toHaveAttribute('href', 'http://api.test/case.pdf?signature=x')
    expect(within(section).queryByRole('button')).not.toBeInTheDocument()
  })

  it('says when there are no work samples', async () => {
    await openDetail()
    expect(within(screen.getByRole('region', { name: 'Portfolio' })).getByText('No work samples.')).toBeInTheDocument()
  })

  it('approves with optional notes and returns to the queue with a toast', async () => {
    await openDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    const dialog = screen.getByRole('dialog', { name: 'Approve Northside Studio?' })
    fireEvent.change(within(dialog).getByLabelText(/Notes for the business/), { target: { value: '  Welcome aboard.  ' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve business' }))

    expect(await screen.findByRole('heading', queueHeading)).toBeInTheDocument()
    expect(JSON.parse(api!.calls('post', `/admin/businesses/${BUSINESS_ID}/approve`)[0][0].data)).toEqual({ notes: 'Welcome aboard.' })
    expect(useToastStore.getState().toasts.map((toast) => toast.message)).toEqual(['Northside Studio was approved.'])
  })

  it('approves without notes', async () => {
    await openDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Approve business' }))

    await screen.findByRole('heading', queueHeading)
    expect(JSON.parse(api!.calls('post', `/admin/businesses/${BUSINESS_ID}/approve`)[0][0].data)).toEqual({})
  })

  it('requires notes to request changes', async () => {
    await openDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Request changes' }))
    const dialog = screen.getByRole('dialog', { name: 'Ask Northside Studio for changes?' })
    const notes = within(dialog).getByLabelText(/What should they change/)
    fireEvent.change(notes, { target: { value: '   ' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Request changes' }))

    expect(await within(dialog).findByText('Tell the business what to change.')).toBeInTheDocument()
    expect(api!.calls('post', `/admin/businesses/${BUSINESS_ID}/request-changes`)).toHaveLength(0)

    fireEvent.change(notes, { target: { value: 'Add a licence number for legal services.' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Request changes' }))

    expect(await screen.findByRole('heading', queueHeading)).toBeInTheDocument()
    expect(JSON.parse(api!.calls('post', `/admin/businesses/${BUSINESS_ID}/request-changes`)[0][0].data)).toEqual({ notes: 'Add a licence number for legal services.' })
    expect(useToastStore.getState().toasts.map((toast) => toast.message)).toEqual(['Changes requested from Northside Studio.'])
  })

  it('shows API validation errors on the notes field', async () => {
    await openDetail({
      reply: ({ method, url }) =>
        method === 'post' && url.endsWith('/request-changes')
          ? { status: 422, data: apiErrorBody('validation_error', [{ loc: ['body', 'notes'], message: 'Notes are too long.', type: 'string_too_long' }]) }
          : undefined,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Request changes' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/What should they change/), { target: { value: 'Fix it.' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Request changes' }))

    expect(await within(dialog).findByText('Notes are too long.')).toBeInTheDocument()
  })

  it('explains when someone else decided first', async () => {
    let decided = false
    await openDetail({
      reply: ({ method, url }) => {
        if (method === 'post' && url.endsWith('/approve')) {
          decided = true
          return { status: 409, data: apiErrorBody('invalid_profile_status', { profile_status: 'approved' }) }
        }
        if (decided && method === 'get' && url === `/admin/businesses/${BUSINESS_ID}`) {
          return { status: 200, data: adminBusiness({ profile_status: 'approved', verification_status: 'verified' }) }
        }
        return undefined
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Approve business' }))

    expect(await screen.findByText(/no longer in review, so no decision was recorded/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument())
    expect(screen.getByText(/Decisions can only be made while a business is in review/)).toBeInTheDocument()
  })

  it('returns to the same queue page after a decision', async () => {
    const queue = Array.from({ length: 25 }, (_, index) => queueItem({ id: index === 22 ? BUSINESS_ID : `b-${index}`, display_name: index === 22 ? 'Northside Studio' : `Business ${index + 1}` }))
    openAt('/admin?page=2', { queue })

    fireEvent.click(await screen.findByRole('link', { name: 'Review Northside Studio' }))
    await screen.findByRole('heading', { level: 1, name: 'Northside Studio' })
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Approve business' }))

    expect(await screen.findByText('Showing 21–25 of 25')).toBeInTheDocument()
  })
})
