import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { useToastStore } from '../../components/feedback'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiBusiness, apiErrorBody, apiMembership, apiUser, mockApi, tokenBody, type MockHandler, type MockReply, type MockRequest } from '../../test/mockApi'
import { topReasons, type FactorResult } from './fitCopy'
import type { BusinessMatch, BusinessMatchSummary, MatchBusiness } from './matchInboxApi'
import { matchTiming } from './matchInboxDisplay'

const STUDIO = '6a1f2c3d-1111-4a2b-9c3d-0123456789ab'
const MATCH_ID = '5d6e7f80-3333-4c4d-9e5f-0123456789ab'
const MATCHES = '/businesses/business-1/matches'

const studio: MatchBusiness = {
  id: STUDIO,
  display_name: 'Northside Studio',
  profile_status: 'approved',
  logo_url: null,
  location_city: 'Detroit',
  location_region: 'MI',
  location_country: 'US',
  service_area: 'regional',
}
const me: MatchBusiness = { ...studio, id: 'business-1', display_name: 'Northstar Digital' }

const allOutcomes: FactorResult[] = [
  { factor: 'category', result: 'fits', reason: 'category_match', values: {} },
  { factor: 'reciprocal', result: 'unknown', reason: 'reciprocal_no_listings', values: {} },
  { factor: 'value', result: 'partial', reason: 'value_close', values: { position: 'above_budget', offer_min_minor: 300000, need_max_minor: 250000 } },
  { factor: 'location', result: 'conflict', reason: 'location_too_far', values: { distance: 42 } },
  { factor: 'trust', result: 'fits', reason: 'trust_portfolio', values: { portfolio_items: 3 } },
]

function summary(overrides: Partial<BusinessMatchSummary> = {}): BusinessMatchSummary {
  return {
    id: MATCH_ID,
    status: 'proposed',
    source: 'concierge',
    fit_band: 'strong',
    my_side: 'a',
    other_business: studio,
    my_response: 'pending',
    other_response: 'pending',
    can_respond: true,
    component_count: 1,
    expires_at: '2026-12-04T12:00:00Z',
    closed_at: null,
    created_at: '2026-11-12T12:00:00Z',
    ...overrides,
  }
}

function detail(overrides: Partial<BusinessMatch> = {}): BusinessMatch {
  return {
    id: MATCH_ID,
    status: 'proposed',
    source: 'concierge',
    fit_band: 'potential',
    operator_note: 'You both work with Detroit food businesses.',
    can_respond: true,
    me: { side: 'a', business: me, response: 'pending', responded_at: null, responded_by_user_id: null, decline_reason: null, decline_text: null },
    other: { side: 'b', business: studio, response: 'accepted', responded_at: '2026-11-13T09:00:00Z' },
    components: [
      {
        id: 'component-1',
        position: 0,
        direction: 'b_to_a',
        my_role: 'client',
        offer_id: 'offer-1',
        need_id: 'need-1',
        fit_band: 'potential',
        offer: { title: 'Brand identity sprint', category_name: 'Branding & design', value_min_minor: 150000, value_max_minor: 300000, currency: 'USD', delivery_format: 'remote' },
        need: { title: 'Rebrand before our funding round', category_name: 'Branding & design', value_min_minor: 100000, value_max_minor: 200000, currency: 'USD', location_preference: 'remote' },
        factors: allOutcomes,
        evaluated_on: '2026-11-12',
      },
    ],
    my_feedback: null,
    expires_at: '2026-12-04T12:00:00Z',
    closed_at: null,
    created_at: '2026-11-12T12:00:00Z',
    updated_at: '2026-11-13T09:00:00Z',
    ...overrides,
  }
}

interface ServerOptions {
  /** Every match the business has, filtered by `status` like the API. */
  matches?: BusinessMatchSummary[]
  match?: BusinessMatch
  reply?: (request: MockRequest) => MockReply | undefined
  role?: 'owner' | 'administrator' | 'member'
}

function server({ matches = [summary()], match = detail(), reply, role = 'owner' }: ServerOptions = {}): MockHandler {
  return (request) => {
    const custom = reply?.(request)
    if (custom) return custom
    const { method, url, config } = request
    if (method === 'post' && url === '/auth/refresh') return { status: 200, data: tokenBody('access-2', 'refresh-2') }
    if (method === 'get' && url === '/account') return { status: 200, data: { user: apiUser({ email_verified: true }), memberships: [apiMembership({ role })] } }
    if (method === 'get' && url === '/businesses/business-1') return { status: 200, data: apiBusiness({ profile_status: 'approved', role }) }
    if (method === 'get' && url === MATCHES) {
      const status = (config.params as { status?: string } | undefined)?.status
      return { status: 200, data: { items: matches.filter((item) => !status || item.status === status), next_cursor: null } }
    }
    if (method === 'get' && url.startsWith(`${MATCHES}/`)) {
      const id = url.slice(MATCHES.length + 1)
      return id === match.id ? { status: 200, data: match } : { status: 404, data: apiErrorBody('not_found') }
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

let api: ReturnType<typeof mockApi> | undefined

beforeEach(() => {
  localStorage.clear()
  clearStoredSession()
  useSessionStore.setState({ status: 'idle', endReason: null })
  useToastStore.setState({ toasts: [] })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  localStorage.setItem(ACCESS_TOKEN_KEY, 'stale-access')
  localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1')
})

afterEach(() => {
  cleanup()
  api?.restore()
  api = undefined
  vi.restoreAllMocks()
})

describe('match inbox', () => {
  it('lists open matches with the fit in words, the top reasons and the expiry', async () => {
    api = mockApi(server())
    renderAt('/matches')

    const list = await screen.findByRole('list', { name: 'Open matches' })
    const card = within(list).getAllByRole('listitem')[0]
    expect(within(card).getByRole('heading', { name: 'Northside Studio' })).toBeInTheDocument()
    expect(within(card).getByText('Detroit, MI, US')).toBeInTheDocument()
    expect(within(card).getByText('Reviewed by BFB')).toBeInTheDocument()
    expect(within(card).getByText('Strong fit')).toBeInTheDocument()
    expect(within(card).getByText('Respond by 4 Dec')).toBeInTheDocument()

    // What fits first, then partly fits, then needs confirming; conflicts stay on the detail.
    const reasons = await within(card).findByRole('list', { name: 'Why you were matched with Northside Studio' })
    expect(within(reasons).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Category, Fits: The offer is in the category the need asks for.',
      'Trust, Fits: Both businesses are approved and the provider shows portfolio work.',
      'Value and budget, Partial: The offer’s value is a little above the budget.',
    ])
    expect(api.calls('get', MATCHES)[0][0].params).toMatchObject({ status: 'proposed' })
    expect(within(card).getByRole('link', { name: 'View match with Northside Studio' })).toHaveAttribute('href', `/matches/${MATCH_ID}`)
  })

  it.each([
    ['strong', 'Strong fit'],
    ['potential', 'Potential fit'],
    ['limited', 'Limited fit'],
  ] as const)('shows the %s band in words, with no numbers', async (band, label) => {
    api = mockApi(server({ matches: [summary({ fit_band: band })], match: detail({ fit_band: band }) }))
    renderAt('/matches')

    const list = await screen.findByRole('list', { name: 'Open matches' })
    const pills = within(list).getByText(label).parentElement!
    expect(pills.textContent).toBe(label)
    await within(list).findByRole('list', { name: /Why you were matched/ })
    expect(within(list).getByRole('list', { name: /Why you were matched/ }).textContent).not.toMatch(/\d|%/)
  })

  it('shows an empty state for a tab with no matches', async () => {
    api = mockApi(server({ matches: [] }))
    renderAt('/matches')

    expect(await screen.findByRole('heading', { name: 'No open matches' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Review your offers and needs' })).toHaveAttribute('href', '/listings')

    fireEvent.click(screen.getByRole('tab', { name: 'Accepted' }))
    expect(await screen.findByRole('heading', { name: 'No accepted matches yet' })).toBeInTheDocument()
  })

  it('shows an expired match under Closed, not Open', async () => {
    const expired = summary({ status: 'expired', can_respond: false, closed_at: '2026-12-04T12:00:00Z' })
    api = mockApi(server({ matches: [expired], match: detail({ status: 'expired', can_respond: false, closed_at: '2026-12-04T12:00:00Z' }) }))
    renderAt('/matches')

    expect(await screen.findByRole('heading', { name: 'No open matches' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Closed' }))
    const list = await screen.findByRole('list', { name: 'Closed matches' })
    const card = within(list).getAllByRole('listitem')[0]
    expect(within(card).getByText('Expired')).toBeInTheDocument()
    expect(within(card).getByText('Expired on 4 Dec without both answers')).toBeInTheDocument()
    expect(within(card).queryByText(/Respond by/)).not.toBeInTheDocument()
    // Closed reads the unfiltered list: the API filters on one status at a time.
    expect(api.calls('get', MATCHES).at(-1)![0].params).not.toHaveProperty('status')
  })

  it('keeps the tab in the URL', async () => {
    api = mockApi(server({ matches: [summary({ status: 'accepted', can_respond: false, my_response: 'accepted', other_response: 'accepted', closed_at: '2026-11-14T10:00:00Z' })] }))
    renderAt('/matches?tab=accepted')

    expect(await screen.findByRole('tab', { name: 'Accepted' })).toHaveAttribute('aria-selected', 'true')
    const list = await screen.findByRole('list', { name: 'Accepted matches' })
    expect(within(list).getByText('You both accepted on 14 Nov')).toBeInTheDocument()
  })

  it('shows an error with a retry', async () => {
    let fail = true
    api = mockApi(server({ reply: ({ method, url }) => (fail && method === 'get' && url === MATCHES ? { status: 500, data: apiErrorBody('internal_error') } : undefined) }))
    renderAt('/matches')

    expect(await screen.findByRole('heading', { name: 'We couldn’t load your matches' })).toBeInTheDocument()
    fail = false
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }))
    expect(await screen.findByRole('list', { name: 'Open matches' })).toBeInTheDocument()
  })

  it('counts the matches waiting on the business in the sidebar and on the dashboard', async () => {
    api = mockApi(
      server({
        matches: [
          summary(),
          summary({ id: 'match-2', other_business: { ...studio, id: 'other-2', display_name: 'Corner Bakery' } }),
          // Answered already: waiting on the other business, not on us.
          summary({ id: 'match-3', can_respond: false, my_response: 'accepted' }),
        ],
      }),
    )
    renderAt('/dashboard')

    expect(await screen.findByText('2 matches waiting on you')).toBeInTheDocument()
    const nav = screen.getByRole('button', { name: /^Matches/ })
    expect(within(nav).getByText('2')).toBeInTheDocument()
    expect(screen.getByText('RESPOND BY 4 DEC')).toBeInTheDocument()
  })
})

describe('match detail', () => {
  it('shows each pair side by side with every factor as words, the note and both responses', async () => {
    api = mockApi(server())
    renderAt(`/matches/${MATCH_ID}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Northside Studio' })).toBeInTheDocument()
    expect(screen.getByText('You both work with Detroit food businesses.')).toBeInTheDocument()
    expect(screen.getByText('Northside Studio’s offer')).toBeInTheDocument()
    expect(screen.getByText('Your need')).toBeInTheDocument()
    expect(screen.getByText('Brand identity sprint')).toBeInTheDocument()
    expect(screen.getByText('$1,500–$3,000')).toBeInTheDocument()

    const factors = screen.getByRole('list', { name: 'How Brand identity sprint fits Rebrand before our funding round' })
    const rows = within(factors).getAllByRole('listitem')
    expect(rows.map((row) => row.querySelector('.fit-factor-outcome')?.textContent)).toEqual(['Fits', 'Needs confirmation', 'Partial', 'Conflict', 'Fits'])
    expect(factors.textContent).not.toMatch(/\d|%/)
    for (const label of ['Strong fit', 'Potential fit', 'Limited fit']) {
      for (const element of screen.queryAllByText(label)) expect(element.textContent).not.toMatch(/\d/)
    }

    const responses = screen.getByRole('list', { name: 'Responses' })
    expect(within(responses).getByText('Northstar Digital (you)')).toBeInTheDocument()
    expect(within(responses).getByText('Waiting for a response')).toBeInTheDocument()
    expect(within(responses).getByText('Accepted')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View public profile/ })).toHaveAttribute('href', `/b/${STUDIO}`)
  })

  it('shows a match that is not the business’s as not found', async () => {
    api = mockApi(server())
    renderAt('/matches/not-a-match')

    expect(await screen.findByRole('heading', { name: 'This match doesn’t exist' })).toBeInTheDocument()
  })
})

describe('match copy', () => {
  it('picks the top reasons without conflicts', () => {
    expect(topReasons([{ factors: allOutcomes }]).map((reason) => reason.factor)).toEqual(['category', 'trust', 'value'])
    expect(topReasons([{ factors: allOutcomes }], 5).map((reason) => reason.factor)).toEqual(['category', 'trust', 'value', 'reciprocal'])
  })

  it('says where a match stands', () => {
    const now = new Date('2026-11-20T12:00:00Z')
    expect(matchTiming(summary(), now).text).toBe('Respond by 4 Dec')
    expect(matchTiming(summary({ can_respond: false, my_response: 'accepted' }), now).text).toBe('You accepted. Waiting for Northside Studio until 4 Dec')
    expect(matchTiming(summary({ status: 'declined', can_respond: false, other_response: 'declined', closed_at: '2026-11-15T12:00:00Z' }), now).text).toBe('Northside Studio declined on 15 Nov')
    expect(matchTiming(summary({ status: 'withdrawn', can_respond: false, closed_at: '2027-01-02T12:00:00Z' }), now).text).toBe('Withdrawn by BFB on 2 Jan 2027')
  })
})

describe('answering a match', () => {
  const DETAIL = `${MATCHES}/${MATCH_ID}`

  it('accepts, and says what happens next once both have accepted', async () => {
    const accepted = detail({
      status: 'accepted',
      can_respond: false,
      me: { ...detail().me, response: 'accepted', responded_at: '2026-11-14T10:00:00Z' },
      closed_at: '2026-11-14T10:00:00Z',
    })
    api = mockApi(server({ reply: ({ method, url }) => (method === 'post' && url === `${DETAIL}/accept` ? { status: 200, data: accepted } : undefined) }))
    renderAt(`/matches/${MATCH_ID}`)

    const panel = await screen.findByRole('region', { name: 'Your answer' })
    expect(within(panel).getByText(/Northside Studio has accepted/)).toBeInTheDocument()
    fireEvent.click(within(panel).getByRole('button', { name: 'Accept match' }))

    expect(await screen.findByRole('heading', { name: 'You both accepted' })).toBeInTheDocument()
    expect(screen.getByText(/A proposal can be started in the next release/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Your answer' })).not.toBeInTheDocument()
    expect(api.calls('post', `${DETAIL}/accept`)).toHaveLength(1)
    expect(useToastStore.getState().toasts.at(-1)?.message).toBe('You and Northside Studio both accepted.')
  })

  it('declines with a reason and a note, saying the other business will not see them', async () => {
    const declined = detail({
      status: 'declined',
      can_respond: false,
      me: { ...detail().me, response: 'declined', responded_at: '2026-11-14T10:00:00Z', decline_reason: 'timing', decline_text: 'Booked until spring.' },
      closed_at: '2026-11-14T10:00:00Z',
    })
    api = mockApi(server({ reply: ({ method, url }) => (method === 'post' && url === `${DETAIL}/decline` ? { status: 200, data: declined } : undefined) }))
    renderAt(`/matches/${MATCH_ID}`)

    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }))
    const dialog = screen.getByRole('dialog', { name: 'Decline the match with Northside Studio?' })
    expect(within(dialog).getByText(/Northside Studio will see that you declined, but not why/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('radio', { name: 'The timing does not work' }))
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Anything else BFB should know/ }), { target: { value: '  Booked until spring. ' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Decline match' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.calls('post', `${DETAIL}/decline`)[0][0].data).toBe(JSON.stringify({ reason: 'timing', text: 'Booked until spring.' }))
    const responses = screen.getByRole('list', { name: 'Responses' })
    expect(within(responses).getByText('Your reason, seen by BFB only')).toBeInTheDocument()
    expect(within(responses).getByText('The timing does not work')).toBeInTheDocument()
    expect(screen.getAllByText('Declined').length).toBeGreaterThan(0)
  })

  it('refreshes the match and explains when it is no longer open', async () => {
    let expired = false
    api = mockApi(
      server({
        reply: ({ method, url }) => {
          if (method === 'post' && url === `${DETAIL}/accept`) {
            expired = true
            return { status: 409, data: apiErrorBody('invalid_match_status', { status: 'expired' }) }
          }
          if (expired && method === 'get' && url === DETAIL) return { status: 200, data: detail({ status: 'expired', can_respond: false, closed_at: '2026-12-04T12:00:00Z' }) }
          return undefined
        },
      }),
    )
    renderAt(`/matches/${MATCH_ID}`)

    fireEvent.click(await screen.findByRole('button', { name: 'Accept match' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This match expired before your answer was saved.')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Accept match' })).not.toBeInTheDocument())
    expect(api.calls('get', DETAIL).length).toBeGreaterThanOrEqual(2)
  })

  it('shows a member the status read-only, with who can answer', async () => {
    api = mockApi(server({ role: 'member' }))
    renderAt(`/matches/${MATCH_ID}`)

    const panel = await screen.findByRole('region', { name: 'Your answer' })
    expect(within(panel).getByText(/Only owners and administrators of Northstar Digital can accept or decline/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accept match' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument()
  })
})

describe('match feedback', () => {
  const FEEDBACK = `${MATCHES}/${MATCH_ID}/feedback`

  it('saves a rating with reasons and a comment, and can be edited later', async () => {
    api = mockApi(
      server({
        role: 'member',
        reply: ({ method, url, body }) =>
          method === 'put' && url === FEEDBACK
            ? { status: 200, data: { ...(body as object), created_at: '2026-11-14T10:00:00Z', updated_at: '2026-11-14T10:00:00Z' } }
            : undefined,
      }),
    )
    renderAt(`/matches/${MATCH_ID}`)

    const section = await screen.findByRole('region', { name: 'Was this match useful?' })
    fireEvent.click(within(section).getByRole('button', { name: 'Not useful' }))
    fireEvent.click(within(section).getByRole('button', { name: 'Timing doesn’t line up' }))
    fireEvent.click(within(section).getByRole('button', { name: 'Value or budget doesn’t line up' }))
    fireEvent.change(within(section).getByRole('textbox', { name: /Comment/ }), { target: { value: 'Out of range this year.' } })
    fireEvent.click(within(section).getByRole('button', { name: 'Save feedback' }))

    await within(section).findByRole('button', { name: /Edit feedback/ })
    expect(api.calls('put', FEEDBACK)[0][0].data).toBe(JSON.stringify({ rating: 'not_useful', reason_codes: ['timing_mismatch', 'budget_mismatch'], comment: 'Out of range this year.' }))
    expect(within(section).getByText('Not useful')).toBeInTheDocument()
    expect(within(within(section).getByRole('list', { name: 'Your reasons' })).getAllByRole('listitem')).toHaveLength(2)

    fireEvent.click(within(section).getByRole('button', { name: /Edit feedback/ }))
    fireEvent.click(within(section).getByRole('button', { name: 'Useful' }))
    fireEvent.click(within(section).getByRole('button', { name: 'Timing doesn’t line up' }))
    fireEvent.click(within(section).getByRole('button', { name: 'Value or budget doesn’t line up' }))
    fireEvent.click(within(section).getByRole('button', { name: 'Save feedback' }))
    await waitFor(() => expect(api!.calls('put', FEEDBACK)).toHaveLength(2))
    expect(JSON.parse(api.calls('put', FEEDBACK)[1][0].data as string)).toEqual({ rating: 'useful', reason_codes: [], comment: 'Out of range this year.' })
  })

  it('is not offered on a withdrawn match', async () => {
    api = mockApi(server({ match: detail({ status: 'withdrawn', can_respond: false, closed_at: '2026-11-20T12:00:00Z' }) }))
    renderAt(`/matches/${MATCH_ID}`)

    await screen.findByRole('heading', { level: 1, name: 'Northside Studio' })
    expect(screen.queryByRole('region', { name: 'Was this match useful?' })).not.toBeInTheDocument()
  })
})
