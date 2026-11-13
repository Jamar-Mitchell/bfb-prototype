import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { useToastStore } from '../../components/feedback'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiErrorBody, mockApi, type MockReply, type MockRequest } from '../../test/mockApi'
import { acceptedMatch, completeTerms, draftProposal, MATCH_ID, PROPOSAL, PROPOSAL_ID, proposalServer, sentProposal, sentVersion, type ProposalServerOptions } from '../../test/proposalServer'

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

const ACCEPT = `${PROPOSAL}/versions/1/accept`
const acceptedProposal = sentProposal({
  status: 'accepted',
  waiting_on: null,
  current_version: sentVersion({ accepted_by: ['a', 'b'] }),
  accepted_version_number: 1,
  agreement_source_id: 'source-1',
  closed_at: '2026-11-16T12:00:00Z',
})

/** A server whose proposal changes after a successful POST. */
function statefulServer(posts: Record<string, (request: MockRequest) => MockReply>) {
  let proposal = sentProposal()
  return start({
    reply: (request) => {
      if (request.method === 'get' && request.url === PROPOSAL) return { status: 200, data: proposal }
      const post = request.method === 'post' ? posts[request.url] : undefined
      if (!post) return undefined
      const result = post(request)
      if (result !== 'network-error' && result.status < 300) proposal = result.data as typeof proposal
      return result
    },
  })
}

describe('accepting a proposal', () => {
  it('confirms with a summary, then shows the proposal as accepted with the next step', async () => {
    statefulServer({ [ACCEPT]: () => ({ status: 200, data: acceptedProposal }) })
    renderAt(`/proposals/${PROPOSAL_ID}`)

    const actions = await screen.findByRole('region', { name: 'Your answer' })
    fireEvent.click(within(actions).getByRole('button', { name: 'Accept' }))
    const dialog = screen.getByRole('dialog', { name: 'Accept version 1?' })
    const summary = dialog.querySelector('.proposal-accept-summary')!
    expect(summary).toHaveTextContent('Northstar Digital providesBrand identity sprint · $3,000')
    expect(summary).toHaveTextContent('Northstar Digital receivesMonthly bookkeeping · $2,700')
    expect(summary).toHaveTextContent('Cash adjustment: Northside Studio pays Northstar Digital $300 when the work is complete.')
    expect(summary).toHaveTextContent('Work ends30 Jun 2027')
    expect(within(dialog).getByText(/Northside Studio accepted this version when they sent it, so accepting makes it final/)).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Accept proposal' }))

    expect(await screen.findByText('Both businesses accepted version 1 on 16 Nov.')).toBeInTheDocument()
    expect(screen.getByText(/This version is final. Next, BFB prepares the Business Exchange Agreement/)).toBeInTheDocument()
    expect(screen.getAllByText('Accepted').length).toBeGreaterThan(0)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Your answer' })).not.toBeInTheDocument()
    expect(api!.calls('post', ACCEPT)).toHaveLength(1)
    expect(useToastStore.getState().toasts.at(-1)?.message).toBe('You and Northside Studio accepted version 1.')
  })

  it('explains missing party details and links to the profile section', async () => {
    statefulServer({ [ACCEPT]: () => ({ status: 422, data: apiErrorBody('party_details_missing', { missing: ['legal_name', 'registered_address.city'] }) }) })
    renderAt(`/proposals/${PROPOSAL_ID}`)

    fireEvent.click(await screen.findByRole('button', { name: 'Accept' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Accept proposal' }))

    expect(await within(dialog).findByText('Add your legal details first')).toBeInTheDocument()
    expect(within(dialog).getByText(/Still needed: legal name and city/)).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /Add legal details/ })).toHaveAttribute('href', '/profile?section=legal-details')
    expect(screen.getByText(/It’s your turn to answer/)).toBeInTheDocument()
  })

  it('refuses accepting a replaced version and loads the current one', async () => {
    statefulServer({
      [ACCEPT]: () => ({ status: 409, data: apiErrorBody('invalid_proposal_status', { status: 'countered', reason: 'not_current_version', current_version_number: 2 }) }),
    })
    renderAt(`/proposals/${PROPOSAL_ID}`)

    fireEvent.click(await screen.findByRole('button', { name: 'Accept' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Accept proposal' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('A newer version replaced the one you were accepting')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(api!.calls('get', PROPOSAL).length).toBeGreaterThan(1))
  })

  it('offers accept alongside a counteroffer in progress, and says the draft goes', async () => {
    start({ proposal: sentProposal({ draft: { version_number: 2, revision: 1, based_on_version_number: 1, terms: completeTerms(), missing: [], created_at: '2026-11-14T09:00:00Z', updated_at: '2026-11-14T09:00:00Z' } }) })
    renderAt(`/proposals/${PROPOSAL_ID}`)

    fireEvent.click(await screen.findByRole('button', { name: 'Accept' }))
    expect(within(screen.getByRole('dialog')).getByText(/Your counteroffer draft \(version 2\) is deleted/)).toBeInTheDocument()
  })

  it('shows the accepted state to the business that sent the version', async () => {
    start({ proposal: { ...acceptedProposal, current_version: sentVersion({ author_side: 'a', accepted_by: ['a', 'b'] }), started_by_side: 'a' } })
    renderAt(`/proposals/${PROPOSAL_ID}`)

    expect(await screen.findByText('Both businesses accepted version 1 on 16 Nov.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Accepted' })).toHaveTextContent('agreements and signatures arrive in the next release')
    expect(screen.queryByRole('button', { name: /Withdraw|Accept|Counter|Decline/ })).not.toBeInTheDocument()
    const versions = screen.getByRole('list', { name: 'Versions' })
    expect(within(versions).getByText('Accepted')).toBeInTheDocument()
    expect(within(versions).getByText(/Accepted by Northstar Digital and Northside Studio/)).toBeInTheDocument()
  })

  it('shows the accepted proposal on the match', async () => {
    start({ match: acceptedMatch({ proposal: { id: PROPOSAL_ID, status: 'accepted', accepted_version_number: 2 } }) })
    renderAt(`/matches/${MATCH_ID}`)

    const panel = await screen.findByRole('region', { name: 'Proposal accepted' })
    expect(panel).toHaveTextContent('You and Northside Studio accepted version 2 of the proposal. The agreement and signatures come next.')
    expect(within(panel).getByRole('link', { name: /Open the proposal/ })).toHaveAttribute('href', `/proposals/${PROPOSAL_ID}`)
    expect(within(panel).queryByRole('button', { name: 'Start a proposal' })).not.toBeInTheDocument()
  })
})

describe('sending without party details', () => {
  it('explains in the send dialog and links to the profile section', async () => {
    start({
      proposal: draftProposal({}, completeTerms(), []),
      reply: ({ method, url }) => {
        if (method === 'get' && (url.endsWith('/offers') || url === '/marketplace/listings')) {
          return { status: 200, data: url.endsWith('/offers') ? [] : { items: [], next_cursor: null } }
        }
        if (method === 'post' && url === `${PROPOSAL}/draft/send`) {
          return { status: 422, data: apiErrorBody('party_details_missing', { missing: ['entity_type'] }) }
        }
        return undefined
      },
    })
    renderAt(`/proposals/${PROPOSAL_ID}/edit`)

    fireEvent.click(await screen.findByRole('button', { name: /Send proposal/ }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send proposal' }))

    expect(await within(dialog).findByText('Add your legal details first')).toBeInTheDocument()
    expect(within(dialog).getByText(/sending a proposal counts as accepting it/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Still needed: entity type/)).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /Add legal details/ })).toHaveAttribute('href', '/profile?section=legal-details')
  })
})
