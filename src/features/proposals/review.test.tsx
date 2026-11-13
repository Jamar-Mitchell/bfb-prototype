import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { useToastStore } from '../../components/feedback'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiErrorBody, mockApi, type MockRequest } from '../../test/mockApi'
import { completeTerms, PROPOSAL, PROPOSAL_ID, proposalServer, sentProposal, sentVersion, type ProposalServerOptions } from '../../test/proposalServer'
import type { Proposal } from './proposalsApi'

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

/** Version 1 that this business (side a) sent, waiting on Northside Studio. */
const ourProposal = () => sentProposal({ current_version: sentVersion({ author_side: 'a', accepted_by: ['a'] }), started_by_side: 'a' })

/** A server whose proposal changes after a POST, as the API's would. */
function statefulServer(initial: Proposal, posts: Record<string, (request: MockRequest) => { status: number; data: unknown }>, options: ProposalServerOptions = {}) {
  let proposal = initial
  return start({
    ...options,
    reply: (request) => {
      const { method, url } = request
      if (method === 'get' && url === PROPOSAL) return { status: 200, data: proposal }
      if (method === 'get' && (url.endsWith('/offers') || url === '/marketplace/listings')) {
        return { status: 200, data: url.endsWith('/offers') ? [] : { items: [], next_cursor: null } }
      }
      const post = method === 'post' ? posts[url] : undefined
      if (!post) return undefined
      const result = post(request)
      if (result.status < 300) proposal = result.data as Proposal
      return result
    },
  })
}

describe('proposal review', () => {
  it('reads like a document for the business that received it, with counter and decline', async () => {
    start({ proposal: sentProposal() })
    renderAt(`/proposals/${PROPOSAL_ID}`)

    const doc = await screen.findByRole('article', { name: 'Brand sprint in exchange for six months of bookkeeping' })
    expect(within(doc).getByText(/Version 1 · sent by Northside Studio on 13 Nov 2026/)).toBeInTheDocument()
    expect(within(doc).getByText('4 Jan 2027')).toBeInTheDocument()
    expect(within(doc).getByText('30 Jun 2027')).toBeInTheDocument()

    // Who provides what, your business first, values side by side.
    const sides = within(doc).getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent)
    expect(sides).toEqual(['Northstar Digital provides', 'Northside Studio provides'])
    expect(within(doc).getByText('Brand identity sprint')).toBeInTheDocument()
    expect(within(doc).getByText('Printing')).toBeInTheDocument()
    expect(within(doc).getAllByText('$3,000').length).toBeGreaterThan(0)
    expect(within(doc).getAllByText('$2,700').length).toBeGreaterThan(0)
    expect(doc.querySelector('.proposal-doc-difference')).toHaveTextContent('Northstar Digital’s services are valued $300 more. Cash adjustment: Northside Studio pays Northstar Digital $300 when the work is complete.')
    expect(doc).not.toHaveTextContent('%')

    // Milestones by date, not by list order.
    const timeline = within(doc).getByRole('list', { name: 'Milestones by date' })
    expect(within(timeline).getAllByRole('listitem').map((item) => item.querySelector('strong')?.textContent)).toEqual(['Logo concepts', 'January books closed'])
    expect(within(timeline).getByText(/Delivered by Northside Studio · Part of Monthly bookkeeping/)).toBeInTheDocument()

    // Terms in words.
    expect(within(doc).getByText('Each business has 5 days to review a delivery and ask for changes.')).toBeInTheDocument()
    expect(within(doc).getByText('Up to 2 rounds of changes are included.')).toBeInTheDocument()
    expect(within(doc).getByText('Either business can cancel with 14 days’ notice.')).toBeInTheDocument()
    expect(within(doc).getByText('Both businesses keep each other’s information confidential.')).toBeInTheDocument()

    expect(screen.getByText(/Northside Studio sent version 1. It’s your turn to answer by 27 Nov/)).toBeInTheDocument()
    const actions = screen.getByRole('region', { name: 'Your answer' })
    expect(within(actions).getByRole('button', { name: 'Counter' })).toBeInTheDocument()
    expect(within(actions).getByRole('button', { name: 'Decline' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Withdraw' })).not.toBeInTheDocument()
  })

  it('shows the sender the same document with only Withdraw', async () => {
    start({ proposal: ourProposal() })
    renderAt(`/proposals/${PROPOSAL_ID}`)

    const doc = await screen.findByRole('article')
    expect(within(doc).getByText(/sent by Northstar Digital/)).toBeInTheDocument()
    expect(screen.getByText(/You sent version 1. Northside Studio has until 27 Nov/)).toBeInTheDocument()
    const actions = screen.getByRole('region', { name: 'Your proposal' })
    expect(within(actions).getByRole('button', { name: 'Withdraw' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Counter' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument()
  })

  it('opens the builder with a copy of the current version when countering', async () => {
    const counterDraft = sentProposal({
      draft: { version_number: 2, revision: 1, based_on_version_number: 1, terms: completeTerms(), missing: [], created_at: '2026-11-14T09:00:00Z', updated_at: '2026-11-14T09:00:00Z' },
    })
    statefulServer(sentProposal(), { [`${PROPOSAL}/counter`]: () => ({ status: 201, data: counterDraft }) })
    renderAt(`/proposals/${PROPOSAL_ID}`)

    fireEvent.click(await screen.findByRole('button', { name: 'Counter' }))

    expect(await screen.findByRole('heading', { name: 'Counteroffer to Northside Studio' })).toBeInTheDocument()
    expect(screen.getByText(/A copy of version 1 to change as you need/)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Summary' })).toHaveValue('Brand sprint in exchange for six months of bookkeeping')
    expect(api!.calls('post', `${PROPOSAL}/counter`)).toHaveLength(1)
  })

  it('continues an open counteroffer instead of starting another', async () => {
    start({ proposal: sentProposal({ draft: { version_number: 2, revision: 3, based_on_version_number: 1, terms: completeTerms(), missing: [], created_at: '2026-11-14T09:00:00Z', updated_at: '2026-11-14T09:00:00Z' } }) })
    renderAt(`/proposals/${PROPOSAL_ID}`)

    const actions = await screen.findByRole('region', { name: 'Your answer' })
    expect(within(actions).getByText(/You’re writing version 2, a counteroffer. Northside Studio still sees version 1/)).toBeInTheDocument()
    expect(within(actions).getByRole('link', { name: 'Continue your counteroffer' })).toHaveAttribute('href', `/proposals/${PROPOSAL_ID}/edit`)
    expect(within(actions).queryByRole('button', { name: 'Counter' })).not.toBeInTheDocument()
  })

  it('declines with a required reason and an optional note that the other business never sees', async () => {
    const declined = sentProposal({ status: 'declined', waiting_on: null, closed_by_side: 'a', closed_at: '2026-11-15T12:00:00Z' })
    statefulServer(sentProposal(), { [`${PROPOSAL}/decline`]: () => ({ status: 200, data: declined }) })
    renderAt(`/proposals/${PROPOSAL_ID}`)

    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }))
    const dialog = screen.getByRole('dialog', { name: 'Decline version 1?' })
    expect(within(dialog).getByText(/Northside Studio will see that you declined, but not why/)).toBeInTheDocument()
    expect(within(dialog).getByText(/seen by BFB only, never by Northside Studio/)).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Decline proposal' }))
    expect(await within(dialog).findByText('Choose a reason.')).toBeInTheDocument()
    expect(api!.calls('post', `${PROPOSAL}/decline`)).toHaveLength(0)

    fireEvent.click(within(dialog).getByRole('radio', { name: 'The values don’t work for us' }))
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Anything else BFB should know/ }), { target: { value: 'Too far apart on value.' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Decline proposal' }))

    expect(await screen.findByText(/Your business declined version 1 on 15 Nov. This proposal is closed/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api!.calls('post', `${PROPOSAL}/decline`)[0][0].data).toEqual(JSON.stringify({ reason: 'value', text: 'Too far apart on value.' }))
    expect(screen.queryByRole('region', { name: 'Your answer' })).not.toBeInTheDocument()
    expect(useToastStore.getState().toasts.at(-1)?.message).toBe('Proposal declined.')
  })

  it('withdraws after asking why', async () => {
    const withdrawn = { ...ourProposal(), status: 'withdrawn' as const, waiting_on: null, closed_by_side: 'a' as const, closed_at: '2026-11-15T12:00:00Z' }
    statefulServer(ourProposal(), { [`${PROPOSAL}/withdraw`]: () => ({ status: 200, data: withdrawn }) })
    renderAt(`/proposals/${PROPOSAL_ID}`)

    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw' }))
    const dialog = screen.getByRole('dialog', { name: 'Withdraw version 1?' })
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Our plans changed' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Withdraw proposal' }))

    expect(await screen.findByText(/Your business withdrew version 1 on 15 Nov/)).toBeInTheDocument()
    expect(api!.calls('post', `${PROPOSAL}/withdraw`)[0][0].data).toEqual(JSON.stringify({ reason: 'changed_plans', text: null }))
    expect(screen.queryByRole('button', { name: 'Withdraw' })).not.toBeInTheDocument()
  })

  it('loads the proposal again when an action is refused with invalid_proposal_status', async () => {
    const closed = sentProposal({ status: 'withdrawn', waiting_on: null, closed_by_side: 'b', closed_at: '2026-11-15T12:00:00Z' })
    statefulServer(sentProposal(), {
      [`${PROPOSAL}/counter`]: () => ({ status: 409, data: apiErrorBody('invalid_proposal_status', { status: 'withdrawn', reason: 'closed' }) }),
    })
    renderAt(`/proposals/${PROPOSAL_ID}`)
    fireEvent.click(await screen.findByRole('button', { name: 'Counter' }))
    // The API now returns the withdrawn proposal.
    api!.restore()
    statefulServer(closed, {})

    expect(await screen.findByRole('alert')).toHaveTextContent('This proposal closed since you opened it, so we loaded it again.')
    expect(await screen.findByText(/Northside Studio withdrew version 1 on 15 Nov/)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Counter' })).not.toBeInTheDocument())
  })

  it('refreshes a decline the API refuses, closing the dialog', async () => {
    statefulServer(sentProposal(), {
      [`${PROPOSAL}/decline`]: () => ({ status: 409, data: apiErrorBody('invalid_proposal_status', { status: 'sent', reason: 'not_your_turn' }) }),
    })
    renderAt(`/proposals/${PROPOSAL_ID}`)
    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('radio', { name: 'The scope isn’t right' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Decline proposal' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('it’s no longer your turn')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(api!.calls('get', PROPOSAL).length).toBeGreaterThan(1))
  })

  it('shows a member everything read-only', async () => {
    start({ role: 'member', proposal: sentProposal() })
    renderAt(`/proposals/${PROPOSAL_ID}`)

    expect(await screen.findByRole('article')).toBeInTheDocument()
    const actions = screen.getByRole('region', { name: 'Your answer' })
    expect(within(actions).getByText(/Only owners and administrators of Northstar Digital can accept, counter or decline/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Counter' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument()
  })

  it('says why an expired proposal closed and offers nothing to act on', async () => {
    start({ proposal: sentProposal({ status: 'expired', waiting_on: null, closed_at: '2026-11-27T12:30:00Z' }) })
    renderAt(`/proposals/${PROPOSAL_ID}`)

    expect(await screen.findByText(/Version 1 expired on 27 Nov without an answer. This proposal is closed/)).toBeInTheDocument()
    expect(screen.getAllByText('Expired').length).toBeGreaterThan(0)
    expect(screen.queryByRole('region', { name: 'Your answer' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Counter|Decline|Withdraw/ })).not.toBeInTheDocument()
  })
})
