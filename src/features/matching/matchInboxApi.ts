import { apiGet, apiPost, apiPut } from '../../lib/api/requests'
import type { components } from '../../lib/api/schema'

type Schemas = components['schemas']

// A business's own matches (bfb-api docs/MATCHING.md, "Participant endpoints"). Any member
// can read them. Of the other business the API returns only its public summary and its
// response: never its decline reason or who answered.

export type BusinessMatch = Schemas['BusinessMatchResponse']
export type BusinessMatchSummary = Schemas['BusinessMatchSummaryResponse']
export type BusinessMatchComponent = Schemas['BusinessMatchComponentResponse']
export type MatchBusiness = Schemas['MatchBusinessSummary']
type MatchStatus = Schemas['MatchStatus']
export type DeclineBody = Schemas['DeclineMatchRequest']
export type FeedbackBody = Schemas['MatchFeedbackRequest']
export type MyFeedback = Schemas['MyFeedbackResponse']

export const INBOX_PAGE_SIZE = 20

/** Inbox tabs. Closed covers declined, expired and withdrawn. */
export type InboxTab = 'open' | 'accepted' | 'closed'

export const INBOX_TABS: Array<{ id: InboxTab; label: string }> = [
  { id: 'open', label: 'Open' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'closed', label: 'Closed' },
]

const CLOSED: readonly MatchStatus[] = ['declined', 'expired', 'withdrawn']

export function inboxTab(status: MatchStatus): InboxTab {
  if (status === 'proposed') return 'open'
  if (status === 'accepted') return 'accepted'
  return 'closed'
}

export function readInboxTab(value: string | null): InboxTab {
  return value === 'accepted' || value === 'closed' ? value : 'open'
}

export interface InboxPage {
  items: BusinessMatchSummary[]
  nextCursor: string | null
}

/** How many unfiltered pages a Closed request reads, at most, looking for closed matches. */
const CLOSED_PAGE_SCAN = 5

/**
 * One page of a tab, newest first. Open and Accepted filter on the API. The API filters on one
 * status at a time, so Closed reads the unfiltered list and keeps the closed matches, reading
 * on (a few pages at most) until it finds some.
 */
export async function listInbox(businessId: string, tab: InboxTab, cursor?: string | null): Promise<InboxPage> {
  if (tab !== 'closed') {
    const status: MatchStatus = tab === 'open' ? 'proposed' : 'accepted'
    const page = await listMatches(businessId, { status, limit: INBOX_PAGE_SIZE, cursor })
    return { items: page.items, nextCursor: page.next_cursor }
  }
  const items: BusinessMatchSummary[] = []
  let next = cursor ?? null
  for (let read = 0; read < CLOSED_PAGE_SCAN; read += 1) {
    const page = await listMatches(businessId, { limit: 50, cursor: next })
    items.push(...page.items.filter((item) => CLOSED.includes(item.status)))
    next = page.next_cursor
    if (!next || items.length > 0) break
  }
  return { items, nextCursor: next }
}

function listMatches(businessId: string, { status, limit, cursor }: { status?: MatchStatus; limit: number; cursor?: string | null }) {
  return apiGet('/businesses/{business_id}/matches', {
    path: { business_id: businessId },
    query: { limit, ...(status ? { status } : {}), ...(cursor ? { cursor } : {}) },
  })
}

export function getBusinessMatch(businessId: string, matchId: string): Promise<BusinessMatch> {
  return apiGet('/businesses/{business_id}/matches/{match_id}', { path: { business_id: businessId, match_id: matchId } })
}

/** Pilot scale: stop counting here rather than page without end. */
const COUNT_PAGE_LIMIT = 5

/** Open matches waiting on this business's answer (`can_respond`). */
export async function countWaitingMatches(businessId: string): Promise<{ count: number; first: BusinessMatchSummary | null }> {
  let count = 0
  let first: BusinessMatchSummary | null = null
  let cursor: string | null = null
  for (let read = 0; read < COUNT_PAGE_LIMIT; read += 1) {
    const page = await listMatches(businessId, { status: 'proposed', limit: 100, cursor })
    for (const item of page.items) {
      if (!item.can_respond) continue
      count += 1
      first ??= item
    }
    cursor = page.next_cursor
    if (!cursor) break
  }
  return { count, first }
}

/** Owners and administrators only (`403 business_role_required` for a member). */
export function acceptMatch(businessId: string, matchId: string): Promise<BusinessMatch> {
  return apiPost('/businesses/{business_id}/matches/{match_id}/accept', undefined, { path: { business_id: businessId, match_id: matchId } })
}

/** Owners and administrators only. The reason and text are seen by staff, never by the other business. */
export function declineMatch(businessId: string, matchId: string, body: DeclineBody): Promise<BusinessMatch> {
  return apiPost('/businesses/{business_id}/matches/{match_id}/decline', body, { path: { business_id: businessId, match_id: matchId } })
}

/** Any member. Replaces the business's whole feedback on the match. */
export function saveMatchFeedback(businessId: string, matchId: string, body: FeedbackBody): Promise<MyFeedback> {
  return apiPut('/businesses/{business_id}/matches/{match_id}/feedback', body, { path: { business_id: businessId, match_id: matchId } })
}
