import { apiGet, apiPost } from '../../lib/api/requests'
import type { components } from '../../lib/api/schema'

type Schemas = components['schemas']

// A business's proposals (bfb-api docs/PROPOSALS.md, "Endpoints"). Any member can read them;
// owners and administrators start, save, send and discard. A business never sees the other
// business's draft: before version 1 is sent, the other business sees `draft` and
// `waiting_on: "them"` with no terms.

export type Proposal = Schemas['ProposalResponse']
export type ProposalSummary = Schemas['ProposalSummaryResponse']
export type ProposalStatus = Schemas['ProposalStatus']
export type ProposalTerms = Schemas['ProposalTerms']
export type ProposalDraft = Schemas['DraftResponse']
export type Side = Schemas['Side']
export type WaitingOn = Schemas['WaitingOn']

/** Statuses a proposal can still move from. The rest are final. */
export const OPEN_STATUSES: readonly ProposalStatus[] = ['draft', 'sent', 'countered']
const CLOSED_STATUSES: readonly ProposalStatus[] = ['declined', 'withdrawn', 'expired']

export function isOpen(status: ProposalStatus): boolean {
  return OPEN_STATUSES.includes(status)
}

/**
 * Proposals page tabs.
 * - Waiting on you: sent to this business and its turn to answer.
 * - Waiting on them: sent by this business, or the other business is still writing version 1.
 * - Drafts: version 1 this business started and has not sent.
 * - Accepted: both businesses accepted the same version.
 * - Closed: declined, withdrawn or expired.
 */
export type ProposalTab = 'us' | 'them' | 'drafts' | 'accepted' | 'closed'

export const PROPOSAL_TABS: Array<{ id: ProposalTab; label: string }> = [
  { id: 'us', label: 'Waiting on you' },
  { id: 'them', label: 'Waiting on them' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'closed', label: 'Closed' },
]

export function readProposalTab(value: string | null): ProposalTab {
  return PROPOSAL_TABS.some(({ id }) => id === value) ? (value as ProposalTab) : 'us'
}

/** The tab a proposal belongs on, from this business's point of view. */
export function proposalTab(proposal: Pick<ProposalSummary, 'status' | 'waiting_on'>): ProposalTab {
  if (proposal.status === 'accepted') return 'accepted'
  if (CLOSED_STATUSES.includes(proposal.status)) return 'closed'
  if (proposal.status === 'draft' && proposal.waiting_on === 'us') return 'drafts'
  return proposal.waiting_on === 'us' ? 'us' : 'them'
}

export const PROPOSALS_PAGE_SIZE = 20

/** How many pages a tab that filters in the browser reads, at most, looking for its proposals. */
const PAGE_SCAN = 5

interface ListQuery {
  status?: ProposalStatus
  waiting_on?: WaitingOn
  limit: number
  cursor?: string | null
}

export function listProposals(businessId: string, { status, waiting_on, limit, cursor }: ListQuery) {
  return apiGet('/businesses/{business_id}/proposals', {
    path: { business_id: businessId },
    query: { limit, ...(status ? { status } : {}), ...(waiting_on ? { waiting_on } : {}), ...(cursor ? { cursor } : {}) },
  })
}

export interface ProposalPage {
  items: ProposalSummary[]
  nextCursor: string | null
}

/**
 * One page of a tab, newest first. Drafts and Accepted filter on the API. Waiting on you and
 * Waiting on them filter on the API too, but Waiting on you leaves out this business's own
 * unsent drafts (they are under Drafts). The API filters on one status at a time, so Closed
 * reads the unfiltered list and keeps the closed proposals. Tabs that filter in the browser
 * read on (a few pages at most) until they find some.
 */
export async function listProposalTab(businessId: string, tab: ProposalTab, cursor?: string | null): Promise<ProposalPage> {
  if (tab === 'drafts' || tab === 'accepted') {
    const query: ListQuery = tab === 'drafts'
      ? { status: 'draft', waiting_on: 'us', limit: PROPOSALS_PAGE_SIZE, cursor }
      : { status: 'accepted', limit: PROPOSALS_PAGE_SIZE, cursor }
    const page = await listProposals(businessId, query)
    return { items: page.items, nextCursor: page.next_cursor }
  }
  const query: Omit<ListQuery, 'cursor'> = tab === 'closed' ? { limit: 50 } : { waiting_on: tab, limit: PROPOSALS_PAGE_SIZE }
  const items: ProposalSummary[] = []
  let next = cursor ?? null
  for (let read = 0; read < PAGE_SCAN; read += 1) {
    const page = await listProposals(businessId, { ...query, cursor: next })
    items.push(...page.items.filter((item) => proposalTab(item) === tab))
    next = page.next_cursor
    if (!next || items.length > 0) break
  }
  return { items, nextCursor: next }
}

/** Pilot scale: stop counting here rather than page without end. */
const COUNT_PAGE_LIMIT = 5

/** Proposals waiting on this business's answer: the Waiting on you tab. */
export async function countWaitingProposals(businessId: string): Promise<number> {
  let count = 0
  let cursor: string | null = null
  for (let read = 0; read < COUNT_PAGE_LIMIT; read += 1) {
    const page = await listProposals(businessId, { waiting_on: 'us', limit: 100, cursor })
    count += page.items.filter((item) => proposalTab(item) === 'us').length
    cursor = page.next_cursor
    if (!cursor) break
  }
  return count
}

/**
 * The match's open or accepted proposal, if any, newest first. The match detail carries no
 * proposal, so this reads the business's proposals (a few pages at most) and picks the match's.
 */
export async function findMatchProposal(businessId: string, matchId: string): Promise<ProposalSummary | null> {
  let cursor: string | null = null
  for (let read = 0; read < COUNT_PAGE_LIMIT; read += 1) {
    const page = await listProposals(businessId, { limit: 100, cursor })
    const found = page.items.find((item) => item.match_id === matchId && (isOpen(item.status) || item.status === 'accepted'))
    if (found) return found
    cursor = page.next_cursor
    if (!cursor) break
  }
  return null
}

export function getProposal(businessId: string, proposalId: string): Promise<Proposal> {
  return apiGet('/businesses/{business_id}/proposals/{proposal_id}', { path: { business_id: businessId, proposal_id: proposalId } })
}

/**
 * Owners and administrators, on an accepted match. Version 1 is a draft by this business,
 * pre-filled from the match's offer-need pairs. `409 proposal_exists` (`details.proposal_id`)
 * when the match already has an open proposal; `409 invalid_match_status` when it is not accepted.
 */
export function startProposal(businessId: string, matchId: string): Promise<Proposal> {
  return apiPost('/businesses/{business_id}/matches/{match_id}/proposals', undefined, { path: { business_id: businessId, match_id: matchId } })
}
