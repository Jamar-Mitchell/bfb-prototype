import { apiDelete, apiGet, apiPost, apiPut } from '../../lib/api/requests'
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
export type SentVersion = Schemas['SentVersionResponse']
export type VersionSummary = Schemas['VersionSummaryResponse']
export type VersionChanges = Schemas['VersionChangesResponse']
export type TermsChange = Schemas['TermsChange']
export type ProposalDeclineReason = Schemas['ProposalDeclineReason']
export type ProposalWithdrawReason = Schemas['WithdrawRequest']['reason']

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

/**
 * Replaces this business's whole draft (no per-field saves). `revision` is the one last returned;
 * an older one is `409 stale_draft` with `details.revision`. Returns the detail with the new
 * revision and the recomputed `missing`.
 */
export function saveDraft(businessId: string, proposalId: string, revision: number, terms: ProposalTerms): Promise<Proposal> {
  return apiPut('/businesses/{business_id}/proposals/{proposal_id}/draft', { revision, terms }, { path: { business_id: businessId, proposal_id: proposalId } })
}

/** Default and range of days the other business has to answer a sent version. */
export const EXPIRY_DAYS = { default: 14, min: 1, max: 30 } as const

/**
 * Sends the draft: it becomes the current version and counts as this business's acceptance.
 * `422 proposal_incomplete` with `details.missing` when anything is missing.
 */
export function sendDraft(businessId: string, proposalId: string, expiresInDays: number): Promise<Proposal> {
  return apiPost('/businesses/{business_id}/proposals/{proposal_id}/draft/send', { expires_in_days: expiresInDays }, { path: { business_id: businessId, proposal_id: proposalId } })
}

/** Discards the draft. Discarding version 1 before anything was sent withdraws the proposal. */
export function discardDraft(businessId: string, proposalId: string): Promise<Proposal> {
  return apiDelete('/businesses/{business_id}/proposals/{proposal_id}/draft', { path: { business_id: businessId, proposal_id: proposalId } })
}

/** An offer the builder can turn into a service. */
export interface OfferChoice {
  id: string
  title: string
  description: string | null
  deliverables: string[]
  value_min_minor: number | null
}

/** This business's active offers. */
export async function listOwnActiveOffers(businessId: string): Promise<OfferChoice[]> {
  const offers = await apiGet('/businesses/{business_id}/offers', { path: { business_id: businessId } })
  return offers.filter((offer) => offer.status === 'active')
}

/**
 * Another business's active offers. There is no endpoint for one business's offers, so this
 * reads active offers on the marketplace (a few pages at most) and keeps that business's.
 */
export async function listOtherActiveOffers(viewerBusinessId: string, otherBusinessId: string): Promise<OfferChoice[]> {
  const found: OfferChoice[] = []
  let cursor: string | null = null
  for (let read = 0; read < COUNT_PAGE_LIMIT; read += 1) {
    const page = await apiGet('/marketplace/listings', {
      query: { kind: 'offer', limit: 50, exclude_business_id: viewerBusinessId, ...(cursor ? { cursor } : {}) },
    })
    for (const item of page.items) {
      if (item.kind === 'offer' && item.business.id === otherBusinessId) found.push(item)
    }
    cursor = page.next_cursor
    if (!cursor) break
  }
  return found
}

/**
 * Starts a counteroffer: a draft copied from the current version, with the next version number.
 * Only the business that did not send the current version. `409 invalid_proposal_status` with
 * `details.reason` `not_your_turn`, `draft_exists` (this business already has a draft) or `closed`.
 */
export function counterProposal(businessId: string, proposalId: string): Promise<Proposal> {
  return apiPost('/businesses/{business_id}/proposals/{proposal_id}/counter', undefined, { path: { business_id: businessId, proposal_id: proposalId } })
}

/** Why a business closes a proposal, and an optional note. Seen by BFB staff only. */
export interface CloseBody<Reason extends string> {
  reason: Reason
  text: string | null
}

/** Declines the current version. Only the business that did not send it; discards its counter draft. */
export function declineProposal(businessId: string, proposalId: string, body: CloseBody<ProposalDeclineReason>): Promise<Proposal> {
  return apiPost('/businesses/{business_id}/proposals/{proposal_id}/decline', body, { path: { business_id: businessId, proposal_id: proposalId } })
}

/** Withdraws the current version. Only the business that sent it; discards any open draft. */
export function withdrawProposal(businessId: string, proposalId: string, body: CloseBody<ProposalWithdrawReason>): Promise<Proposal> {
  return apiPost('/businesses/{business_id}/proposals/{proposal_id}/withdraw', body, { path: { business_id: businessId, proposal_id: proposalId } })
}

/** One sent version in full. Any member; works on closed proposals. A draft is `404`. */
export function getVersion(businessId: string, proposalId: string, versionNumber: number): Promise<SentVersion> {
  return apiGet('/businesses/{business_id}/proposals/{proposal_id}/versions/{version_number}', {
    path: { business_id: businessId, proposal_id: proposalId, version_number: versionNumber },
  })
}

/**
 * What changed from version `from` (default the one before) to `versionNumber`, item by item.
 * The API does the comparison; the page only renders it (bfb-api docs/PROPOSALS.md, "Changes").
 */
export function getVersionChanges(businessId: string, proposalId: string, versionNumber: number, from?: number): Promise<VersionChanges> {
  return apiGet('/businesses/{business_id}/proposals/{proposal_id}/versions/{version_number}/changes', {
    path: { business_id: businessId, proposal_id: proposalId, version_number: versionNumber },
    ...(from ? { query: { from } } : {}),
  })
}

/**
 * Accepts the current sent version for this business. `409 invalid_proposal_status` with
 * `details.reason` `closed`, `not_current_version` or `already_accepted` (and
 * `details.current_version_number`); then `422 party_details_missing` with `details.missing`.
 * When both businesses have accepted, the proposal is `accepted`.
 */
export function acceptVersion(businessId: string, proposalId: string, versionNumber: number): Promise<Proposal> {
  return apiPost('/businesses/{business_id}/proposals/{proposal_id}/versions/{version_number}/accept', undefined, {
    path: { business_id: businessId, proposal_id: proposalId, version_number: versionNumber },
  })
}
