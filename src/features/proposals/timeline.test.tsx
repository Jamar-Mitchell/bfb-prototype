import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App'
import { useToastStore } from '../../components/feedback'
import { ACCESS_TOKEN_KEY, clearStoredSession, REFRESH_TOKEN_KEY } from '../../lib/auth/tokens'
import { useSessionStore } from '../../stores/session'
import { apiErrorBody, mockApi } from '../../test/mockApi'
import { completeTerms, PROPOSAL, PROPOSAL_ID, proposalServer, sentProposal, sentVersion } from '../../test/proposalServer'
import { describeChange } from './changeCopy'
import { normalizeTerms } from './proposalDraft'
import type { TermsChange } from './proposalsApi'

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

// Northside Studio (b) sent version 1; Northstar Digital (a, this business) countered with version 2.
const v1 = sentVersion({ is_current: false })
const v2Terms = completeTerms({
  end_date: '2027-07-31',
  sides: {
    a: { services: [{ key: 's1', offer_id: 'offer-a', title: 'Brand identity sprint', description: 'Two-week sprint.', deliverables: ['Logo suite', 'Brand guide'], exclusions: ['Printing'], value_minor: 250000 }] },
    b: {
      services: [
        { key: 's2', offer_id: 'offer-b', title: 'Monthly bookkeeping', description: null, deliverables: ['Monthly reconciliation'], exclusions: [], value_minor: 270000 },
        { key: 's3', offer_id: null, title: 'Quarterly tax filing', description: null, deliverables: ['Filing pack'], exclusions: [], value_minor: 90000 },
        { key: 's4', offer_id: null, title: 'Website copy', description: null, deliverables: ['Home page copy'], exclusions: [], value_minor: 40000 },
      ],
    },
  },
})
const v2 = sentVersion({ version_number: 2, author_side: 'a', accepted_by: ['a'], based_on_version_number: 1, sent_at: '2026-11-15T09:00:00Z', terms: v2Terms })
const countered = sentProposal({
  status: 'countered',
  waiting_on: 'them',
  current_version: v2,
  versions: [
    { version_number: 1, author_side: 'b', sent_at: v1.sent_at, expires_at: v1.expires_at, accepted_by: ['b'], is_current: false },
    { version_number: 2, author_side: 'a', sent_at: v2.sent_at, expires_at: v2.expires_at, accepted_by: ['a'], is_current: true },
  ],
})

const CHANGES: TermsChange[] = [
  { kind: 'changed', item: 'terms', key: null, side: null, field: 'end_date', before: '2027-06-30', after: '2027-07-31' },
  { kind: 'changed', item: 'service', key: 's1', side: 'a', field: 'value_minor', before: 300000, after: 250000 },
  { kind: 'added', item: 'service', key: 's3', side: 'b', field: null, before: null, after: v2Terms.sides!.b!.services![1] },
  { kind: 'changed', item: 'service', key: 's4', side: 'b', field: 'side', before: 'a', after: 'b' },
  { kind: 'removed', item: 'service', key: 's5', side: 'a', field: null, before: { key: 's5', title: 'Printed flyers', value_minor: 20000, deliverables: ['200 flyers'] }, after: null },
  { kind: 'added', item: 'milestone', key: 'm3', side: null, field: null, before: null, after: { key: 'm3', title: 'Tax pack ready', responsible: 'b', due_date: '2027-04-15' } },
  { kind: 'removed', item: 'milestone', key: 'm9', side: null, field: null, before: { key: 'm9', title: 'Kick-off call', responsible: 'a', due_date: '2027-01-05' }, after: null },
  { kind: 'changed', item: 'milestone', key: 'm1', side: null, field: 'due_date', before: '2027-01-18', after: '2027-01-25' },
  { kind: 'changed', item: 'terms', key: null, side: null, field: 'revision_limit', before: 2, after: 3 },
  { kind: 'changed', item: 'cash_adjustment', key: null, side: null, field: 'amount_minor', before: 30000, after: 45000 },
]

function start(changes: TermsChange[] = CHANGES, role: 'owner' | 'member' = 'owner') {
  api = mockApi(
    proposalServer({
      role,
      proposal: countered,
      reply: ({ method, url }) => {
        if (method !== 'get') return undefined
        if (url === `${PROPOSAL}/versions/2/changes`) return { status: 200, data: { from_version_number: 1, to_version_number: 2, changes } }
        if (url === `${PROPOSAL}/versions/1`) return { status: 200, data: v1 }
        if (url === `${PROPOSAL}/versions/2`) return { status: 200, data: v2 }
        if (url === `${PROPOSAL}/versions/3`) return { status: 404, data: apiErrorBody('not_found') }
        return undefined
      },
    }),
  )
  return api
}

describe('version timeline', () => {
  it('lists every sent version newest first with who sent it, when, and who accepted it', async () => {
    start()
    renderAt(`/proposals/${PROPOSAL_ID}`)

    const list = await screen.findByRole('list', { name: 'Versions' })
    const [second, first] = within(list).getAllByRole('listitem').filter((item) => item.classList.contains('proposal-version'))
    expect(second).toHaveTextContent('Version 2')
    expect(second).toHaveTextContent('Current')
    expect(second).toHaveTextContent('Sent by Northstar Digital on 15 Nov 2026. Accepted by Northstar Digital.')
    expect(within(second).queryByRole('link', { name: /Open version/ })).not.toBeInTheDocument()
    expect(first).toHaveTextContent('Replaced')
    expect(first).toHaveTextContent('Sent by Northside Studio on 13 Nov 2026. Accepted by Northside Studio.')
    expect(within(first).getByRole('link', { name: 'Open version 1' })).toHaveAttribute('href', `/proposals/${PROPOSAL_ID}/versions/1`)
    expect(within(first).queryByRole('button', { name: /What changed/ })).not.toBeInTheDocument()
  })

  it('shows what changed in the current version, with before and after for each kind of change', async () => {
    start()
    renderAt(`/proposals/${PROPOSAL_ID}`)

    const changes = await screen.findByRole('list', { name: 'Changes from version 1 to version 2' })
    const rows = within(changes).getAllByRole('listitem').map((row) => row.textContent)
    expect(rows).toEqual([
      'ChangedEnd date30 Jun 202731 Jul 2027',
      'ChangedBrand identity sprint (Northstar Digital): value$3,000$2,500',
      'AddedService: Quarterly tax filing (Northside Studio)$900 · Filing pack',
      'ChangedWebsite copy (Northside Studio): provided byNorthstar DigitalNorthside Studio',
      'RemovedService: Printed flyers (Northstar Digital)$200 · 200 flyers',
      'AddedMilestone: Tax pack readyDue 15 Apr 2027, delivered by Northside Studio',
      'RemovedMilestone: Kick-off callDue 5 Jan 2027, delivered by Northstar Digital',
      'ChangedLogo concepts: due date18 Jan 202725 Jan 2027',
      'ChangedRevision rounds23',
      'ChangedCash adjustment: amount$300$450',
    ])
    expect(within(changes).getByLabelText('Before: $3,000')).toBeInTheDocument()
    expect(within(changes).getByLabelText('After: $2,500')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'What changed from version 1' }))
    expect(screen.getByRole('button', { name: 'What changed from version 1' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('says when nothing changed', async () => {
    start([])
    renderAt(`/proposals/${PROPOSAL_ID}`)
    expect(await screen.findByText('Nothing changed from version 1.')).toBeInTheDocument()
  })

  it('opens an older version read-only, marked as replaced, with nothing to act on', async () => {
    start()
    renderAt(`/proposals/${PROPOSAL_ID}/versions/1`)

    expect(await screen.findByRole('heading', { name: 'Replaced by version 2' })).toBeInTheDocument()
    expect(screen.getByText(/This version can’t be accepted or changed. Accepted by Northside Studio./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open version 2' })).toHaveAttribute('href', `/proposals/${PROPOSAL_ID}`)
    const doc = screen.getByRole('article')
    expect(within(doc).getByText(/Version 1 · sent by Northside Studio/)).toBeInTheDocument()
    expect(within(doc).getAllByText('$3,000').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /Counter|Decline|Withdraw|Accept/ })).not.toBeInTheDocument()
  })

  it('sends the current version back to the proposal page', async () => {
    start()
    renderAt(`/proposals/${PROPOSAL_ID}/versions/2`)
    expect(await screen.findByRole('list', { name: 'Versions' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Northside Studio', level: 1 })).toBeInTheDocument()
  })

  it('says when a version does not exist', async () => {
    start()
    renderAt(`/proposals/${PROPOSAL_ID}/versions/3`)
    expect(await screen.findByRole('heading', { name: 'This version doesn’t exist' })).toBeInTheDocument()
  })
})

describe('change wording', () => {
  const context = { names: { a: 'Northstar Digital', b: 'Northside Studio' }, currency: 'USD', terms: normalizeTerms(completeTerms()) }

  it('words an added and a removed cash adjustment', () => {
    expect(describeChange({ kind: 'added', item: 'cash_adjustment', field: null, before: null, after: { payer: 'b', amount_minor: 30000, timing: 'on_signing', note: null } }, context))
      .toEqual({ kind: 'added', subject: 'Cash adjustment', summary: 'Northside Studio pays Northstar Digital $300 when the agreement is signed' })
    expect(describeChange({ kind: 'removed', item: 'cash_adjustment', field: null, before: { payer: 'a', amount_minor: 1000, timing: null, note: null }, after: null }, context).summary)
      .toBe('Northstar Digital pays Northside Studio $10')
  })

  it('words terms fields and empty values', () => {
    expect(describeChange({ kind: 'changed', item: 'terms', field: 'ip_terms', before: null, after: 'license_to_use' }, context))
      .toMatchObject({ subject: 'Who owns the work', before: 'Not set', after: 'License to use' })
    expect(describeChange({ kind: 'changed', item: 'terms', field: 'confidentiality', before: true, after: false }, context))
      .toMatchObject({ before: 'Confidential', after: 'No confidentiality clause' })
    expect(describeChange({ kind: 'changed', item: 'service', key: 's1', side: 'a', field: 'deliverables', before: ['Logo suite'], after: ['Logo suite', 'Brand guide'] }, context))
      .toMatchObject({ subject: 'Brand identity sprint (Northstar Digital): deliverables', before: 'Logo suite', after: 'Logo suite, Brand guide' })
    expect(describeChange({ kind: 'changed', item: 'milestone', key: 'm1', field: 'service_key', before: null, after: 's1' }, context))
      .toMatchObject({ subject: 'Logo concepts: part of', before: 'Not set', after: 'Brand identity sprint' })
  })
})
