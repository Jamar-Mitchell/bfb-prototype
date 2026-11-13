import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { useToastStore } from '../../components/feedback'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiErrorBody, mockApi } from '../../test/mockApi'
import { acceptedMatch, draftProposal, MATCH_ID, PROPOSAL_ID, PROPOSALS, proposalServer, proposalSummary, type ProposalServerOptions } from '../../test/proposalServer'
import { proposalTiming } from './proposalCopy'
import { proposalTab } from './proposalsApi'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

let api: ReturnType<typeof mockApi> | undefined

function start(options: ProposalServerOptions = {}) {
  api = mockApi(proposalServer(options))
  return api
}

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

const waitingOnUs = proposalSummary({ id: 'p-us', summary: 'Brand sprint for bookkeeping', status: 'countered', current_version_number: 2 })
const waitingOnThem = proposalSummary({ id: 'p-them', summary: 'Photos for copywriting', waiting_on: 'them', started_by_side: 'a' })
const theirDraft = proposalSummary({ id: 'p-their-draft', status: 'draft', summary: null, waiting_on: 'them', current_version_number: null, expires_at: null })
const ourDraft = proposalSummary({ id: 'p-draft', status: 'draft', summary: 'Website for accounting', waiting_on: 'us', current_version_number: null, has_draft: true, expires_at: null, updated_at: '2026-11-14T09:00:00Z' })
const accepted = proposalSummary({ id: 'p-accepted', status: 'accepted', waiting_on: null, summary: 'Logo for legal review', closed_at: '2026-11-20T12:00:00Z' })
const declined = proposalSummary({ id: 'p-declined', status: 'declined', waiting_on: null, summary: 'Ads for catering', closed_at: '2026-11-18T12:00:00Z' })
const expired = proposalSummary({ id: 'p-expired', status: 'expired', waiting_on: null, summary: 'Video for printing', closed_at: '2026-11-27T12:00:00Z' })
const all = [waitingOnUs, waitingOnThem, theirDraft, ourDraft, accepted, declined, expired]

/** Query params of the page's list requests (the sidebar's count reads 100 at a time). */
function listCalls() {
  return api!.calls('get', PROPOSALS).map(([config]) => config.params as Record<string, unknown>).filter((params) => params.limit !== 100)
}

function rowSummaries(list: HTMLElement) {
  return within(list).getAllByRole('listitem').map((item) => item.querySelector('.proposal-row-summary')?.textContent)
}

describe('proposals page', () => {
  it('shows proposals waiting on you by default, with the version, status, whose turn and the respond-by date', async () => {
    start({ proposals: all })
    renderAt('/proposals')

    const list = await screen.findByRole('list', { name: 'Waiting on you proposals' })
    expect(rowSummaries(list)).toEqual(['Brand sprint for bookkeeping'])
    const row = within(list).getByRole('listitem')
    expect(within(row).getByRole('heading', { name: 'Northside Studio' })).toBeInTheDocument()
    expect(within(row).getByText('Countered')).toBeInTheDocument()
    expect(within(row).getByText('Version 2')).toBeInTheDocument()
    expect(within(row).getByText('Waiting on you')).toBeInTheDocument()
    expect(within(row).getByText('Respond by 27 Nov')).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: 'Open proposal with Northside Studio' })).toHaveAttribute('href', '/proposals/p-us')
    expect(listCalls()[0]).toMatchObject({ waiting_on: 'us' })
  })

  it('counts proposals waiting on you in the sidebar and on the tab', async () => {
    start({ proposals: all })
    renderAt('/proposals')

    const nav = await screen.findByRole('button', { name: /Proposals/ })
    await waitFor(() => expect(within(nav).getByLabelText('1 waiting on you')).toHaveTextContent('1'))
    expect(within(screen.getByRole('tab', { name: /Waiting on you/ })).getByLabelText('1 waiting on you')).toBeInTheDocument()
  })

  it('shows proposals waiting on the other business, including one it is still writing', async () => {
    start({ proposals: all })
    renderAt('/proposals?tab=them')

    const list = await screen.findByRole('list', { name: 'Waiting on them proposals' })
    expect(rowSummaries(list)).toEqual(['Photos for copywriting', 'Northside Studio is preparing a proposal for you.'])
    const [sent, preparing] = within(list).getAllByRole('listitem')
    expect(within(sent).getByText('Waiting on Northside Studio')).toBeInTheDocument()
    expect(within(sent).getByText('Northside Studio responds by 27 Nov')).toBeInTheDocument()
    expect(within(preparing).getByText('Being prepared')).toBeInTheDocument()
    expect(within(preparing).getByText('Not sent yet')).toBeInTheDocument()
    expect(listCalls().at(-1)).toMatchObject({ waiting_on: 'them' })
  })

  it('shows your unsent drafts under Drafts, not Waiting on you', async () => {
    start({ proposals: all })
    renderAt('/proposals')
    await screen.findByRole('list', { name: 'Waiting on you proposals' })

    fireEvent.click(screen.getByRole('tab', { name: 'Drafts' }))
    const list = await screen.findByRole('list', { name: 'Drafts proposals' })
    expect(rowSummaries(list)).toEqual(['Website for accounting'])
    expect(within(list).getByText('Waiting on you to send it')).toBeInTheDocument()
    expect(within(list).getByText('Last edited 14 Nov')).toBeInTheDocument()
    expect(listCalls().at(-1)).toMatchObject({ status: 'draft', waiting_on: 'us' })
  })

  it('shows accepted proposals', async () => {
    start({ proposals: all })
    renderAt('/proposals?tab=accepted')

    const list = await screen.findByRole('list', { name: 'Accepted proposals' })
    expect(rowSummaries(list)).toEqual(['Logo for legal review'])
    expect(within(list).getByText('Both accepted on 20 Nov')).toBeInTheDocument()
    expect(within(list).queryByText(/Waiting on/)).not.toBeInTheDocument()
  })

  it('shows declined, withdrawn and expired proposals under Closed', async () => {
    start({ proposals: all })
    renderAt('/proposals?tab=closed')

    const list = await screen.findByRole('list', { name: 'Closed proposals' })
    expect(rowSummaries(list)).toEqual(['Ads for catering', 'Video for printing'])
    expect(within(list).getByText('Declined on 18 Nov')).toBeInTheDocument()
    expect(within(list).getByText('Expired on 27 Nov')).toBeInTheDocument()
  })

  it('shows an empty state for a tab with nothing in it', async () => {
    start({ proposals: [] })
    renderAt('/proposals')

    expect(await screen.findByRole('heading', { name: 'Nothing waiting on you' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See accepted matches' })).toHaveAttribute('href', '/matches?tab=accepted')
  })

  it('shows an error with a retry when the list fails', async () => {
    let fail = true
    start({ proposals: all, reply: ({ method, url }) => (method === 'get' && url === PROPOSALS && fail ? { status: 500, data: apiErrorBody('internal_error') } : undefined) })
    renderAt('/proposals?tab=accepted')

    expect(await screen.findByRole('heading', { name: 'We couldn’t load your proposals' })).toBeInTheDocument()
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('list', { name: 'Accepted proposals' })).toBeInTheDocument()
  })
})

describe('proposal tabs and timing', () => {
  it('puts each status on one tab', () => {
    expect(all.map(proposalTab)).toEqual(['us', 'them', 'them', 'drafts', 'accepted', 'closed', 'closed'])
    expect(proposalTab({ status: 'withdrawn', waiting_on: null })).toBe('closed')
  })

  it('words the timing of each status', () => {
    const now = new Date('2026-11-15T12:00:00Z')
    expect(proposalTiming(proposalSummary({ status: 'withdrawn', waiting_on: null, closed_at: '2026-11-16T12:00:00Z' }), now).text).toBe('Withdrawn on 16 Nov')
    expect(proposalTiming(theirDraft, now).text).toBe('Northside Studio is writing the first version')
  })
})

describe('starting a proposal from an accepted match', () => {
  it('starts a proposal and opens the builder', async () => {
    start({
      reply: ({ method, url }) =>
        method === 'post' && url === `/businesses/business-1/matches/${MATCH_ID}/proposals`
          ? { status: 201, data: draftProposal() }
          : method === 'get' && (url.endsWith('/offers') || url === '/marketplace/listings')
            ? { status: 200, data: url.endsWith('/offers') ? [] : { items: [], next_cursor: null } }
            : undefined,
    })
    renderAt(`/matches/${MATCH_ID}`)

    const panel = await screen.findByRole('region', { name: 'You both accepted' })
    fireEvent.click(await within(panel).findByRole('button', { name: 'Start a proposal' }))

    expect(await screen.findByRole('heading', { name: 'Proposal to Northside Studio' })).toBeInTheDocument()
    expect(api!.calls('post', `/businesses/business-1/matches/${MATCH_ID}/proposals`)).toHaveLength(1)
    expect(useToastStore.getState().toasts.at(-1)?.message).toMatch(/Proposal started/)
  })

  it('links to the open proposal the match carries', async () => {
    start({ match: acceptedMatch({ proposal: { id: PROPOSAL_ID, status: 'sent', accepted_version_number: null } }) })
    renderAt(`/matches/${MATCH_ID}`)

    const panel = await screen.findByRole('region', { name: 'You both accepted' })
    expect(await within(panel).findByRole('link', { name: /Open the proposal/ })).toHaveAttribute('href', `/proposals/${PROPOSAL_ID}`)
    expect(within(panel).getByText('Sent')).toBeInTheDocument()
    expect(api!.calls('get', PROPOSALS).filter(([config]) => (config.params as { limit?: number }).limit !== 100)).toHaveLength(0)
    expect(within(panel).queryByRole('button', { name: 'Start a proposal' })).not.toBeInTheDocument()
  })

  it('links to the open proposal when starting finds one (proposal_exists)', async () => {
    start({
      reply: ({ method, url }) =>
        method === 'post' && url === `/businesses/business-1/matches/${MATCH_ID}/proposals`
          ? { status: 409, data: apiErrorBody('proposal_exists', { proposal_id: 'p-open' }) }
          : undefined,
    })
    renderAt(`/matches/${MATCH_ID}`)

    const panel = await screen.findByRole('region', { name: 'You both accepted' })
    fireEvent.click(await within(panel).findByRole('button', { name: 'Start a proposal' }))

    expect(await within(panel).findByRole('link', { name: /Open the proposal/ })).toHaveAttribute('href', '/proposals/p-open')
    expect(within(panel).getByText('A proposal for this match is already open.')).toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: 'Start a proposal' })).not.toBeInTheDocument()
  })

  it('offers a new proposal after the last one closed', async () => {
    start({ match: acceptedMatch({ proposal: { id: 'p-old', status: 'declined', accepted_version_number: null } }) })
    renderAt(`/matches/${MATCH_ID}`)

    const panel = await screen.findByRole('region', { name: 'You both accepted' })
    expect(within(panel).getByText('The last proposal was declined. You can start a new one.')).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Start a proposal' })).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: 'See the last proposal' })).toHaveAttribute('href', '/proposals/p-old')
  })

  it('shows a member no start button', async () => {
    start({ role: 'member' })
    renderAt(`/matches/${MATCH_ID}`)

    const panel = await screen.findByRole('region', { name: 'You both accepted' })
    expect(await within(panel).findByText(/Only owners and administrators of Northstar Digital can start a proposal/)).toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: 'Start a proposal' })).not.toBeInTheDocument()
  })

  it('reloads the match when it is no longer accepted', async () => {
    start({
      reply: ({ method, url }) =>
        method === 'post' && url === `/businesses/business-1/matches/${MATCH_ID}/proposals`
          ? { status: 409, data: apiErrorBody('invalid_match_status', { status: 'withdrawn' }) }
          : undefined,
    })
    renderAt(`/matches/${MATCH_ID}`)

    const panel = await screen.findByRole('region', { name: 'You both accepted' })
    fireEvent.click(await within(panel).findByRole('button', { name: 'Start a proposal' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This match is no longer accepted')
    await waitFor(() => expect(api!.calls('get', `/businesses/business-1/matches/${MATCH_ID}`).length).toBeGreaterThan(1))
  })
})

describe('proposal page', () => {
  it('says the other business is writing the first version', async () => {
    start({ proposal: draftProposal({ draft: null, waiting_on: 'them', started_by_side: 'b' }) })
    renderAt(`/proposals/${PROPOSAL_ID}`)

    expect(await screen.findByText(/Northside Studio is writing the first version/)).toBeInTheDocument()
    expect(screen.getAllByText('Being prepared').length).toBeGreaterThan(0)
  })
})
