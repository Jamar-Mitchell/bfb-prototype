import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { useToastStore } from '../../components/feedback'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiErrorBody, apiMembership, apiUser, mockApi, tokenBody, type MockHandler, type MockReply, type MockRequest } from '../../test/mockApi'
import type { AdminMatch, ApprovedBusiness, CandidatePair, MatchBusiness, MatchCandidate, MatchSummary } from './matchesApi'
import { expiryTimestamp } from './NewMatchPage'

const STUDIO = '6a1f2c3d-1111-4a2b-9c3d-0123456789ab'
const BAKERY = '7b2c3d4e-2222-4b3c-8d4e-0123456789ab'
const MATCH_ID = '5d6e7f80-3333-4c4d-9e5f-0123456789ab'

const summary = (id: string, name: string): MatchBusiness => ({
  id,
  display_name: name,
  profile_status: 'approved',
  logo_url: null,
  location_city: 'Detroit',
  location_region: 'MI',
  location_country: 'US',
  service_area: 'regional',
})
const studio = summary(STUDIO, 'Northside Studio')
const bakery = summary(BAKERY, 'Corner Bakery')

const factors: CandidatePair['factors'] = [
  { factor: 'category', result: 'fits', reason: 'category_match', values: {} },
  { factor: 'reciprocal', result: 'unknown', reason: 'reciprocal_no_listings', values: {} },
  { factor: 'value', result: 'partial', reason: 'value_close', values: { position: 'above_budget', offer_min_minor: 300000 } },
  { factor: 'location', result: 'conflict', reason: 'location_too_far', values: {} },
]

function pair(offerId: string, offerTitle: string, needId: string, needTitle: string, provider = STUDIO): CandidatePair {
  const client = provider === STUDIO ? BAKERY : STUDIO
  return {
    offer: { id: offerId, business_id: provider, title: offerTitle, category_id: 'cat-1', category_name: 'Branding & design' },
    need: { id: needId, business_id: client, title: needTitle, category_id: 'cat-1', category_name: 'Branding & design' },
    fit_band: 'potential',
    factors,
  } as CandidatePair
}

function candidate(overrides: Partial<MatchCandidate> = {}): MatchCandidate {
  return {
    business: bakery,
    fit_band: 'potential',
    open_match_id: null,
    pairs: [pair('offer-1', 'Brand identity sprint', 'need-1', 'New bakery brand'), pair('offer-2', 'Catering', 'need-2', 'Launch party food', BAKERY)],
    ...overrides,
  }
}

function matchSummary(overrides: Partial<MatchSummary> = {}): MatchSummary {
  return {
    id: MATCH_ID,
    status: 'proposed',
    source: 'concierge',
    fit_band: 'strong',
    business_a: studio,
    business_b: bakery,
    business_a_response: 'accepted',
    business_b_response: 'pending',
    component_count: 2,
    expires_at: '2026-11-26T12:00:00Z',
    closed_at: null,
    created_at: '2026-11-12T12:00:00Z',
    ...overrides,
  }
}

function adminMatch(overrides: Partial<AdminMatch> = {}): AdminMatch {
  return {
    ...matchSummary(),
    operator_note: 'You both work with Detroit food businesses.',
    created_by_user_id: 'staff-1',
    participants: [
      { side: 'a', business: studio, response: 'accepted', responded_at: '2026-11-13T09:00:00Z', responded_by_user_id: 'u-1', decline_reason: null, decline_text: null },
      { side: 'b', business: bakery, response: 'declined', responded_at: '2026-11-13T10:00:00Z', responded_by_user_id: 'u-2', decline_reason: 'timing', decline_text: 'Busy until spring.' },
    ],
    components: [
      {
        id: 'comp-1',
        position: 0,
        direction: 'a_to_b',
        offer_id: 'offer-1',
        need_id: 'need-1',
        fit_band: 'strong',
        offer: { title: 'Brand identity sprint', category_name: 'Branding & design' },
        need: { title: 'New bakery brand' },
        factors,
        evaluated_on: '2026-11-12',
      },
    ],
    withdrawn_at: null,
    withdrawn_by_user_id: null,
    withdrawal_reason: null,
    updated_at: '2026-11-13T10:00:00Z',
    ...overrides,
  }
}

const approved = (id: string, name: string) => ({ id, display_name: name, legal_name: null, profile_status: 'approved', categories: [] }) as unknown as ApprovedBusiness

interface ServerOptions {
  candidates?: MatchCandidate[]
  matches?: MatchSummary[]
  reply?: (request: MockRequest) => MockReply | undefined
}

function apiServer({ candidates = [candidate()], matches = [matchSummary()], reply }: ServerOptions = {}): MockHandler {
  const user = apiUser({ email_verified: true, platform_role: 'support' })
  return (request) => {
    const custom = reply?.(request)
    if (custom) return custom
    const { method, url, config } = request
    if (method === 'post' && url === '/auth/refresh') return { status: 200, data: { ...tokenBody('access-2', 'refresh-2'), user } }
    if (method === 'get' && url === '/account') return { status: 200, data: { user, memberships: [apiMembership()] } }
    if (method === 'get' && url === '/admin/reviews') {
      if ((config.params as { status?: string }).status !== 'approved') return { status: 200, data: { items: [], total: 0, limit: 20, offset: 0 } }
      return { status: 200, data: { items: [approved(STUDIO, 'Northside Studio'), approved(BAKERY, 'Corner Bakery')], total: 2, limit: 100, offset: 0 } }
    }
    if (method === 'get' && url === '/admin/match-candidates') return { status: 200, data: { business: studio, items: candidates } }
    if (method === 'post' && url === '/admin/matches') return { status: 201, data: adminMatch({ status: 'proposed' }) }
    if (method === 'get' && url === '/admin/matches') {
      const { cursor } = (config.params ?? {}) as { cursor?: string }
      return cursor === 'page-2'
        ? { status: 200, data: { items: [matchSummary({ id: 'older', business_b: summary('x', 'Bright Lens Photo') })], next_cursor: null } }
        : { status: 200, data: { items: matches, next_cursor: matches.length > 0 ? 'page-2' : null } }
    }
    if (method === 'get' && url === `/admin/matches/${MATCH_ID}`) return { status: 200, data: adminMatch() }
    if (method === 'post' && url === `/admin/matches/${MATCH_ID}/withdraw`) {
      return { status: 200, data: adminMatch({ status: 'withdrawn', withdrawn_at: '2026-11-14T09:00:00Z', withdrawal_reason: (request.body as { reason: string }).reason }) }
    }
    return { status: 404, data: apiErrorBody('not_found') }
  }
}

let api: ReturnType<typeof mockApi> | undefined

function openAt(path: string, options: ServerOptions = {}) {
  localStorage.setItem(ACCESS_TOKEN_KEY, 'stale-access')
  localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1')
  api = mockApi(apiServer(options))
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
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

describe('matches list', () => {
  it('opens from the admin nav and lists matches with words for fit', async () => {
    openAt('/admin')
    // Staff with a business also have the business's own Matches item; the admin one comes last.
    fireEvent.click((await screen.findAllByRole('button', { name: /Matches/ })).at(-1)!)

    expect(await screen.findByRole('heading', { level: 1, name: 'Concierge matches.' })).toBeInTheDocument()
    const rows = within(await screen.findByRole('list', { name: 'Matches' })).getAllByRole('listitem')
    expect(rows).toHaveLength(1)
    expect(within(rows[0]).getByText('Strong fit')).toBeInTheDocument()
    expect(within(rows[0]).getByText('Proposed')).toBeInTheDocument()
    expect(within(rows[0]).queryByText(/%/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Matches' })).toHaveAttribute('aria-current', 'page')
  })

  it('filters by status and business, through the URL', async () => {
    openAt('/admin/matches')
    await screen.findByRole('list', { name: 'Matches' })

    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: 'declined' } })
    await waitFor(() => expect(api!.calls('get', '/admin/matches').at(-1)![0].params).toEqual({ limit: 20, status: 'declined' }))

    await waitFor(() => expect(within(screen.getByRole('combobox', { name: 'Business' })).getByRole('option', { name: 'Corner Bakery' })).toBeInTheDocument())
    fireEvent.change(screen.getByRole('combobox', { name: 'Business' }), { target: { value: BAKERY } })
    await waitFor(() => expect(api!.calls('get', '/admin/matches').at(-1)![0].params).toEqual({ limit: 20, status: 'declined', business_id: BAKERY }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Declined · Corner Bakery' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    await waitFor(() => expect(api!.calls('get', '/admin/matches').at(-1)![0].params).toEqual({ limit: 20 }))
  })

  it('loads the next page with the cursor', async () => {
    openAt('/admin/matches')
    fireEvent.click(await screen.findByRole('button', { name: 'Load more' }))

    expect(await screen.findByText(/Bright Lens Photo/, { selector: 'strong' })).toBeInTheDocument()
    expect(api!.calls('get', '/admin/matches').at(-1)![0].params).toEqual({ limit: 20, cursor: 'page-2' })
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('shows an empty state for filters with no matches', async () => {
    openAt('/admin/matches?status=expired', { matches: [] })

    expect(await screen.findByRole('heading', { name: 'No matches with these filters' })).toBeInTheDocument()
  })
})

describe('creating a match', () => {
  it('picks a business, a candidate and pairs, then creates the match', async () => {
    openAt('/admin/matches/new')
    fireEvent.click(await screen.findByRole('button', { name: 'See fits for Northside Studio' }))

    const fits = await screen.findByRole('list', { name: 'Suggested fits' })
    expect(within(fits).getByText('Potential fit')).toBeInTheDocument()
    expect(within(fits).getByText(/Corner Bakery offers “Catering” for Northside Studio’s need “Launch party food”/)).toBeInTheDocument()
    expect(api!.calls('get', '/admin/match-candidates')[0][0].params).toEqual({ business_id: STUDIO, limit: 50 })
    fireEvent.click(within(fits).getByRole('button', { name: 'Choose pairs with Corner Bakery' }))

    // Factor results in words, with the reason behind each.
    const why = await screen.findByRole('list', { name: 'Why Brand identity sprint fits New bakery brand' })
    expect(within(why).getByText('Needs confirmation')).toBeInTheDocument()
    expect(within(why).getByText('The offer’s value is a little above the budget.')).toBeInTheDocument()
    expect(within(why).getByText('Conflict')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Create match' }))
    expect(await screen.findByText('Choose at least one offer and need to introduce.')).toBeInTheDocument()
    expect(api!.calls('post', '/admin/matches')).toHaveLength(0)

    fireEvent.click(screen.getByRole('checkbox', { name: 'Catering for Launch party food' }))
    fireEvent.change(screen.getByLabelText(/Note for both businesses/), { target: { value: '  Both in Detroit.  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create match' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Northside Studio & Corner Bakery' })).toBeInTheDocument()
    const body = JSON.parse(api!.calls('post', '/admin/matches')[0][0].data as string)
    expect(body).toMatchObject({
      business_a_id: STUDIO,
      business_b_id: BAKERY,
      pairs: [{ offer_id: 'offer-2', need_id: 'need-2' }],
      operator_note: 'Both in Detroit.',
    })
    expect(new Date(body.expires_at).getTime()).toBeGreaterThan(Date.now() + 13 * 24 * 3600 * 1000)
    expect(useToastStore.getState().toasts[0]?.message).toBe('Match proposed to Northside Studio and Corner Bakery.')
  })

  it('links to the existing match on 409 match_exists', async () => {
    openAt(`/admin/matches/new?business=${STUDIO}&candidate=${BAKERY}`, {
      reply: ({ method, url }) => (method === 'post' && url === '/admin/matches' ? { status: 409, data: apiErrorBody('match_exists', { match_id: MATCH_ID }) } : undefined),
    })
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Brand identity sprint for New bakery brand' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create match' }))

    const alert = await screen.findByText(/already have an open match/)
    expect(alert).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: /Open the existing match/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Northside Studio & Corner Bakery' })).toBeInTheDocument()
  })

  it('links to the open match instead of offering create', async () => {
    openAt(`/admin/matches/new?business=${STUDIO}`, { candidates: [candidate({ open_match_id: MATCH_ID })] })

    const link = await screen.findByRole('link', { name: 'Open the existing match with Corner Bakery' })
    expect(link).toHaveAttribute('href', `/admin/matches/${MATCH_ID}`)
    expect(screen.queryByRole('button', { name: /Choose pairs/ })).not.toBeInTheDocument()
  })

  it('offers to reload when a listing changed', async () => {
    openAt(`/admin/matches/new?business=${STUDIO}&candidate=${BAKERY}`, {
      reply: ({ method, url }) =>
        method === 'post' && url === '/admin/matches' ? { status: 409, data: apiErrorBody('invalid_listing_status', { kind: 'offer', status: 'paused' }) } : undefined,
    })
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Brand identity sprint for New bakery brand' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create match' }))

    expect(await screen.findByText(/changed since these fits were loaded/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reload suggested fits' }))
    await waitFor(() => expect(api!.calls('get', '/admin/match-candidates')).toHaveLength(2))
  })

  it('explains a business that is not approved', async () => {
    openAt(`/admin/matches/new?business=${STUDIO}`, {
      reply: ({ url }) => (url === '/admin/match-candidates' ? { status: 409, data: apiErrorBody('business_not_approved', { profile_status: 'in_review' }) } : undefined),
    })

    expect(await screen.findByRole('heading', { name: 'This business isn’t approved' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Choose another business' }))
    expect(await screen.findByRole('heading', { name: 'Choose a business' })).toBeInTheDocument()
  })

  it('caps the expiry at the API’s 90 days', () => {
    const now = new Date('2026-11-12T12:00:00Z').getTime()
    const capped = new Date(expiryTimestamp('2027-02-10', now)).getTime()
    expect(capped).toBeLessThanOrEqual(now + 90 * 24 * 3600 * 1000)
  })
})

describe('match detail', () => {
  it('shows both responses, the staff-only decline reason and the pairs', async () => {
    openAt(`/admin/matches/${MATCH_ID}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Northside Studio & Corner Bakery' })).toBeInTheDocument()
    const responses = screen.getByRole('region', { name: 'Responses' })
    expect(within(responses).getByText('Accepted')).toBeInTheDocument()
    expect(within(responses).getByText('The timing does not work')).toBeInTheDocument()
    expect(within(responses).getByText('Busy until spring.')).toBeInTheDocument()
    expect(screen.getByText('You both work with Detroit food businesses.')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Why Brand identity sprint fits New bakery brand' })).toBeInTheDocument()
    // Feedback arrives with API-3.6: nothing shown until the field exists.
    expect(screen.queryByRole('region', { name: 'Feedback' })).not.toBeInTheDocument()
  })

  it('shows feedback when the API sends it', async () => {
    openAt(`/admin/matches/${MATCH_ID}`, {
      reply: ({ url }) =>
        url === `/admin/matches/${MATCH_ID}`
          ? { status: 200, data: adminMatch({ feedback: [{ side: 'b', outcome: 'not_a_fit', comment: 'We need someone local.', created_at: '2026-11-14T09:00:00Z' }] }) }
          : undefined,
    })

    const feedback = await screen.findByRole('region', { name: 'Feedback' })
    expect(within(feedback).getByText('Not a fit')).toBeInTheDocument()
    expect(within(feedback).getByText('We need someone local.')).toBeInTheDocument()
    expect(within(feedback).getByText(/Corner Bakery/)).toBeInTheDocument()
  })

  it('withdraws an open match with a reason', async () => {
    openAt(`/admin/matches/${MATCH_ID}`)
    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw match' }))

    const dialog = screen.getByRole('dialog', { name: 'Withdraw this match?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Withdraw match' }))
    expect(await within(dialog).findByText('Give a reason for withdrawing.')).toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText(/Why are you withdrawing it/), { target: { value: 'Business asked us to pause.' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Withdraw match' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(JSON.parse(api!.calls('post', `/admin/matches/${MATCH_ID}/withdraw`)[0][0].data as string)).toEqual({ reason: 'Business asked us to pause.' })
    expect(screen.getAllByText('Withdrawn').length).toBeGreaterThan(0)
    expect(screen.getByText('Business asked us to pause.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Withdraw match' })).not.toBeInTheDocument()
  })

  it('reloads when the match closed before the withdraw', async () => {
    let closed = false
    openAt(`/admin/matches/${MATCH_ID}`, {
      reply: ({ method, url }) => {
        if (method === 'post' && url === `/admin/matches/${MATCH_ID}/withdraw`) {
          closed = true
          return { status: 409, data: apiErrorBody('invalid_match_status', { status: 'accepted' }) }
        }
        if (closed && url === `/admin/matches/${MATCH_ID}`) return { status: 200, data: adminMatch({ status: 'accepted', closed_at: '2026-11-14T09:00:00Z' }) }
        return undefined
      },
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw match' }))
    fireEvent.change(screen.getByLabelText(/Why are you withdrawing it/), { target: { value: 'Pause.' } })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Withdraw match' }))

    expect(await screen.findByText(/no longer open, so it was not withdrawn/)).toBeInTheDocument()
    expect(await screen.findByText('This match is closed. Nothing more can change.')).toBeInTheDocument()
  })
})
