import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { useToastStore } from '../../components/feedback'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiErrorBody, mockApi, type MockReply, type MockRequest } from '../../test/mockApi'
import { draftProposal, PROPOSAL, PROPOSAL_ID, prefilledTerms, proposalServer, type ProposalServerOptions } from '../../test/proposalServer'
import { describeMissing } from './proposalCopy'
import { cashForDifference, compareValues, moveMilestone, newKey, normalizeTerms, removeService, updateMilestone } from './proposalDraft'
import type { Proposal, ProposalTerms } from './proposalsApi'
import { autosaveTiming } from './useDraftAutosave'

const DRAFT = `${PROPOSAL}/draft`
const EDIT = `/proposals/${PROPOSAL_ID}/edit`

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

let api: ReturnType<typeof mockApi> | undefined

/** A server whose draft saves succeed, bump the revision and return `missing`. */
function start(options: ProposalServerOptions & { saveReply?: (request: MockRequest) => MockReply | undefined; missingAfterSave?: string[] } = {}) {
  const { saveReply, missingAfterSave, reply, ...rest } = options
  let revision = (options.proposal ?? draftProposal()).draft?.revision ?? 1
  api = mockApi(
    proposalServer({
      ...rest,
      reply: (request) => {
        const custom = reply?.(request)
        if (custom) return custom
        if (request.method === 'put' && request.url === DRAFT) {
          const failure = saveReply?.(request)
          if (failure) return failure
          revision += 1
          const body = request.body as { terms: ProposalTerms }
          const base = options.proposal ?? draftProposal()
          return { status: 200, data: { ...base, draft: { ...base.draft!, revision, terms: body.terms, missing: missingAfterSave ?? base.draft!.missing } } }
        }
        if (request.method === 'get' && request.url.startsWith('/businesses/business-1/offers')) return { status: 200, data: [] }
        if (request.method === 'get' && request.url === '/marketplace/listings') return { status: 200, data: { items: [], next_cursor: null } }
        return undefined
      },
    }),
  )
  return api
}

function puts() {
  return api!.calls('put', DRAFT).map(([config]) => JSON.parse(config.data as string) as { revision: number; terms: ProposalTerms })
}

beforeEach(() => {
  localStorage.clear()
  clearStoredSession()
  useSessionStore.setState({ status: 'idle', endReason: null })
  useToastStore.setState({ toasts: [] })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  localStorage.setItem(ACCESS_TOKEN_KEY, 'stale-access')
  localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1')
  autosaveTiming.delayMs = 40
})

afterEach(() => {
  cleanup()
  api?.restore()
  api = undefined
  vi.restoreAllMocks()
  autosaveTiming.delayMs = 900
})

const pause = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms))

async function openBuilder() {
  renderAt(EDIT)
  return screen.findByRole('heading', { name: 'Proposal to Northside Studio' })
}

describe('proposal builder autosave', () => {
  it('saves the whole draft in one request per pause', async () => {
    start()
    await openBuilder()

    const summary = screen.getByRole('textbox', { name: 'Summary' })
    fireEvent.change(summary, { target: { value: 'B' } })
    fireEvent.change(summary, { target: { value: 'Br' } })
    fireEvent.change(summary, { target: { value: 'Brand sprint' } })
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2027-01-04' } })
    expect(puts()).toHaveLength(0)

    await waitFor(() => expect(puts()).toHaveLength(1))
    await pause()
    expect(puts()).toHaveLength(1)
    const [saved] = puts()
    expect(saved.revision).toBe(1)
    expect(saved.terms).toMatchObject({ summary: 'Brand sprint', start_date: '2027-01-04', sides: prefilledTerms().sides })
    expect(await screen.findByText('All changes saved')).toBeInTheDocument()

    // The next pause sends the new revision.
    fireEvent.change(summary, { target: { value: 'Brand sprint for books' } })
    await waitFor(() => expect(puts()).toHaveLength(2))
    expect(puts()[1].revision).toBe(2)
  })

  it('keeps local edits when a save fails, and sends them with the next save', async () => {
    let fail = true
    start({ saveReply: () => (fail ? { status: 500, data: apiErrorBody('internal_error') } : undefined) })
    await openBuilder()

    const summary = screen.getByRole('textbox', { name: 'Summary' })
    fireEvent.change(summary, { target: { value: 'Brand sprint' } })
    expect(await screen.findByText('Couldn’t save your changes')).toBeInTheDocument()
    expect(summary).toHaveValue('Brand sprint')

    fail = false
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2027-06-30' } })
    await waitFor(() => expect(puts()).toHaveLength(2))
    expect(puts()[1].terms).toMatchObject({ summary: 'Brand sprint', end_date: '2027-06-30' })
    expect(await screen.findByText('All changes saved')).toBeInTheDocument()
  })

  it('retries a failed save on request', async () => {
    let fail = true
    start({ saveReply: () => (fail ? 'network-error' : undefined) })
    await openBuilder()

    fireEvent.change(screen.getByRole('textbox', { name: 'Summary' }), { target: { value: 'Brand sprint' } })
    await screen.findByText('Couldn’t save your changes')
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('All changes saved')).toBeInTheDocument()
    expect(puts().at(-1)!.terms.summary).toBe('Brand sprint')
  })

  it('reloads and explains when the draft was saved somewhere else (stale_draft)', async () => {
    let reloaded = false
    start({
      saveReply: () => {
        reloaded = true
        return { status: 409, data: apiErrorBody('stale_draft', { revision: 4 }) }
      },
      reply: ({ method, url }) =>
        method === 'get' && url === PROPOSAL && reloaded
          ? { status: 200, data: draftProposal({}, prefilledTerms({ summary: 'A teammate’s summary' })) }
          : undefined,
    })
    await openBuilder()

    fireEvent.change(screen.getByRole('textbox', { name: 'Summary' }), { target: { value: 'Mine' } })
    expect(await screen.findByRole('alert')).toHaveTextContent('This draft was saved somewhere else')
    expect(await screen.findByRole('textbox', { name: 'Summary' })).toHaveValue('A teammate’s summary')
  })
})

describe('proposal builder content', () => {
  it('lists what is missing in words and links each item to its place', async () => {
    const terms = prefilledTerms({ milestones: [{ key: 'm1', responsible: 'a', service_key: 's1', title: 'Logo concepts', description: null, due_date: null, acceptance_criteria: null }] })
    start({ proposal: draftProposal({}, terms, ['end_date', 'services.s2.value', 'milestones.m1.due_date', 'sides.b.milestones', 'ip_terms']) })
    await openBuilder()

    const list = screen.getByRole('list', { name: 'Still missing' })
    expect(within(list).getAllByRole('button').map((item) => item.textContent)).toEqual([
      'Add an end date',
      'Monthly bookkeeping: add a value above zero',
      'Logo concepts: add a due date',
      'Northside Studio delivers no milestone yet: add one',
      'Choose who owns the work',
    ])
    fireEvent.click(within(list).getByRole('button', { name: 'Logo concepts: add a due date' }))
    expect(document.activeElement).toBe(document.getElementById('proposal-milestone-m1'))
    expect(screen.getByRole('button', { name: 'Send proposal' })).toBeDisabled()
  })

  it('compares the two totals and pre-fills a cash adjustment for the difference', async () => {
    start()
    await openBuilder()

    const panel = screen.getByRole('region', { name: 'Value comparison' })
    expect(within(panel).getByText('Northstar Digital provides').nextSibling).toHaveTextContent('$3,000')
    expect(within(panel).getByText('Northside Studio provides').nextSibling).toHaveTextContent('$2,700')
    expect(within(panel).getByText('Difference').nextSibling).toHaveTextContent('$300')
    expect(panel.textContent).not.toMatch(/%|fair/i)

    fireEvent.click(within(panel).getByRole('button', { name: 'Add a cash adjustment of $300' }))
    const cash = screen.getByRole('region', { name: 'Cash adjustment' })
    expect(within(cash).getByRole('combobox', { name: 'Who pays' })).toHaveValue('b')
    expect(within(cash).getByRole('textbox', { name: 'Amount' })).toHaveValue('300')
    expect(within(panel).getByText(/Cash adjustment: Northside Studio pays \$300/)).toBeInTheDocument()

    await waitFor(() => expect(puts()).toHaveLength(1))
    expect(puts()[0].terms.cash_adjustment).toEqual({ payer: 'b', amount_minor: 30000, timing: null, note: null })
  })

  it('reorders milestones', async () => {
    const terms = prefilledTerms({
      milestones: [
        { key: 'm1', responsible: 'a', service_key: null, title: 'Logo concepts', description: null, due_date: null, acceptance_criteria: null },
        { key: 'm2', responsible: 'b', service_key: null, title: 'January books', description: null, due_date: null, acceptance_criteria: null },
      ],
    })
    start({ proposal: draftProposal({}, terms) })
    await openBuilder()

    expect(screen.getByRole('button', { name: 'Move Logo concepts up' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Move Logo concepts down' }))
    const list = screen.getByRole('list', { name: 'Milestones in order' })
    expect(within(list).getAllByRole('listitem').map((item) => item.getAttribute('aria-label'))).toEqual(['January books', 'Logo concepts'])
    await waitFor(() => expect(puts()).toHaveLength(1))
    expect(puts()[0].terms.milestones!.map((milestone) => milestone.key)).toEqual(['m2', 'm1'])
  })

  it('adds a service with a key of its own and removes one', async () => {
    start()
    await openBuilder()

    fireEvent.click(screen.getByRole('button', { name: 'Write a service for you' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove Monthly bookkeeping' }))
    await waitFor(() => expect(puts()).toHaveLength(1))
    const { sides } = puts()[0].terms
    expect(sides!.a!.services!.map((service) => service.key)).toEqual(['s1', expect.stringMatching(/^s-/)])
    expect(sides!.b!.services).toEqual([])
  })

  it('shows a member no editor', async () => {
    start({ role: 'member' })
    renderAt(EDIT)

    expect(await screen.findByRole('heading', { name: 'Only owners and administrators can edit this draft' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Summary' })).not.toBeInTheDocument()
  })
})

describe('sending and discarding', () => {
  const complete = draftProposal({}, prefilledTerms({ summary: 'Ready' }), [])

  it('confirms with the expiry, sends, and opens the proposal', async () => {
    const sent: Proposal = { ...complete, status: 'sent', waiting_on: 'them', draft: null }
    start({
      proposal: complete,
      reply: ({ method, url }) => (method === 'post' && url === `${DRAFT}/send` ? { status: 200, data: sent } : undefined),
    })
    await openBuilder()

    fireEvent.click(screen.getByRole('button', { name: 'Send proposal' }))
    const dialog = await screen.findByRole('dialog', { name: 'Send version 1 to Northside Studio?' })
    expect(within(dialog).getByRole('combobox', { name: 'Time to respond' })).toHaveValue('14')
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Time to respond' }), { target: { value: '7' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send proposal' }))

    await waitFor(() => expect(api!.calls('post', `${DRAFT}/send`)).toHaveLength(1))
    expect(JSON.parse(api!.calls('post', `${DRAFT}/send`)[0][0].data as string)).toEqual({ expires_in_days: 7 })
    expect(await screen.findByRole('link', { name: 'Back to proposals' })).toBeInTheDocument()
    expect(useToastStore.getState().toasts.at(-1)?.message).toBe('Version 1 sent to Northside Studio.')
  })

  it('shows what is missing when sending is refused (proposal_incomplete)', async () => {
    start({
      proposal: complete,
      reply: ({ method, url }) => (method === 'post' && url === `${DRAFT}/send` ? { status: 422, data: apiErrorBody('proposal_incomplete', { missing: ['revision_limit'] }) } : undefined),
    })
    await openBuilder()

    fireEvent.click(screen.getByRole('button', { name: 'Send proposal' }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Send proposal' }))

    expect(await screen.findByRole('button', { name: 'Set a revision limit of 0 to 10' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('A few things are still missing')
  })

  it('discards the draft after asking, and goes back to the match', async () => {
    start({
      reply: ({ method, url }) => (method === 'delete' && url === DRAFT ? { status: 200, data: { ...draftProposal(), status: 'withdrawn', draft: null, waiting_on: null } } : undefined),
    })
    await openBuilder()

    fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Discard this draft?' })
    expect(dialog).toHaveTextContent('the proposal is withdrawn')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Discard draft' }))

    await waitFor(() => expect(api!.calls('delete', DRAFT)).toHaveLength(1))
    expect(await screen.findByRole('link', { name: 'Back to matches' })).toBeInTheDocument()
    expect(useToastStore.getState().toasts.at(-1)?.message).toMatch(/Draft discarded/)
    expect(puts()).toHaveLength(0)
  })

  it('cancelling the discard keeps the draft', async () => {
    start()
    await openBuilder()

    fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }))
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(api!.calls('delete', DRAFT)).toHaveLength(0)
  })
})

describe('draft logic', () => {
  const terms = normalizeTerms(
    prefilledTerms({ milestones: [{ key: 'm1', responsible: 'b', service_key: 's2', title: null, description: null, due_date: null, acceptance_criteria: null }] }),
  )

  it('compares totals and suggests the lower side pays the difference', () => {
    const comparison = compareValues(terms)
    expect(comparison).toMatchObject({ totals: { a: 300000, b: 270000 }, difference: 30000, higher: 'a' })
    expect(cashForDifference(comparison)).toEqual({ payer: 'b', amount_minor: 30000, timing: null, note: null })
    expect(cashForDifference(compareValues(normalizeTerms(prefilledTerms({ sides: { a: { services: [] }, b: { services: [] } } }))))).toBeNull()
  })

  it('keeps keys unique and never reuses one', () => {
    const values = ['s1', 's1', 'abc']
    expect(newKey(terms, 's', () => values.shift()!.replace(/^s/, ''))).toBe('s-1')
  })

  it('drops a milestone’s service when it is removed or belongs to the other business', () => {
    expect(removeService(terms, 'b', 's2').milestones[0].service_key).toBeNull()
    expect(updateMilestone(terms, 'm1', { responsible: 'a' }).milestones[0].service_key).toBeNull()
    expect(moveMilestone(terms, 'm1', -1)).toBe(terms)
  })

  it('words every kind of missing key', () => {
    const names = { a: 'Northstar Digital', b: 'Northside Studio' }
    expect(describeMissing('end_date_before_start_date', terms, names).text).toBe('The end date is before the start date')
    expect(describeMissing('sides.a.services', terms, names)).toMatchObject({ text: 'Northstar Digital provides nothing yet: add a service', anchor: 'proposal-side-a' })
    expect(describeMissing('services.s1.deliverables', terms, names).text).toBe('Brand identity sprint: add at least one deliverable, with no blank ones')
    expect(describeMissing('milestones.m1.due_date_outside_dates', terms, names).text).toBe('Milestone 1: the due date is outside the proposal’s start and end dates')
    expect(describeMissing('milestones.m1.service_key', terms, names).section).toBe('milestones')
    expect(describeMissing('cash_adjustment.timing', terms, names)).toMatchObject({ section: 'cash', anchor: 'proposal-section-cash' })
    expect(describeMissing('something_new', terms, names).text).toBe('Something else needs finishing')
  })
})
