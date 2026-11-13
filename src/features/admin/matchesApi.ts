import { apiGet, apiPost } from '../../lib/api/requests'
import type { components } from '../../lib/api/schema'

type Schemas = components['schemas']

export type MatchBusiness = Schemas['MatchBusinessSummary']
export type MatchCandidates = Schemas['MatchCandidatesResponse']
export type MatchCandidate = Schemas['MatchCandidateResponse']
export type CandidatePair = Schemas['CandidatePair']
export type MatchSummary = Schemas['MatchSummaryResponse']
export type MatchList = Schemas['MatchListResponse']
export type CreateMatchBody = Schemas['CreateMatchRequest']
export type ApprovedBusiness = Schemas['ReviewQueueItem']

/**
 * Staff match detail. `feedback` arrives with API-3.6; until then it is absent, and its
 * shape is read defensively (see `MatchFeedback`).
 */
export type AdminMatch = Schemas['AdminMatchResponse'] & { feedback?: unknown }
export type MatchParticipant = Schemas['ParticipantResponse']
export type MatchComponent = Schemas['MatchComponentResponse']

// Concierge match workspace (bfb-api docs/MATCHING.md, "Staff workspace"). Support and
// administrator users only.

export const MATCHES_PAGE_SIZE = 20
export const CANDIDATE_LIMIT = 50
const BUSINESS_PAGE_SIZE = 100
/** Pilot scale: stop paging approved businesses here rather than load without end. */
const BUSINESS_LIMIT = 1000

/**
 * Approved businesses, by name, for picking one to match. There is no staff business
 * search yet, so this pages through the review list filtered to `approved`.
 */
export async function listApprovedBusinesses(): Promise<ApprovedBusiness[]> {
  const items: ApprovedBusiness[] = []
  for (let offset = 0; offset < BUSINESS_LIMIT; offset += BUSINESS_PAGE_SIZE) {
    const page = await apiGet('/admin/reviews', { query: { status: 'approved', limit: BUSINESS_PAGE_SIZE, offset } })
    items.push(...page.items)
    if (items.length >= page.total || page.items.length === 0) break
  }
  return items.sort((a, b) => a.display_name.localeCompare(b.display_name))
}

/** Ranked suggested fits for one approved business. The list order is the ranking. */
export function getMatchCandidates(businessId: string) {
  return apiGet('/admin/match-candidates', { query: { business_id: businessId, limit: CANDIDATE_LIMIT } })
}

export function createMatch(body: CreateMatchBody) {
  return apiPost('/admin/matches', body) as Promise<AdminMatch>
}

export interface MatchFilters {
  status?: Schemas['MatchStatus']
  businessId?: string
}

/** Newest first. Pass `next_cursor` back as `cursor` for the next page. */
export function listMatches({ status, businessId }: MatchFilters, cursor?: string | null) {
  return apiGet('/admin/matches', {
    query: { limit: MATCHES_PAGE_SIZE, ...(status ? { status } : {}), ...(businessId ? { business_id: businessId } : {}), ...(cursor ? { cursor } : {}) },
  })
}

export function getMatch(matchId: string) {
  return apiGet('/admin/matches/{match_id}', { path: { match_id: matchId } }) as Promise<AdminMatch>
}

/** Only while `proposed`; otherwise `409 invalid_match_status`. The reason is staff only. */
export function withdrawMatch(matchId: string, reason: string) {
  return apiPost('/admin/matches/{match_id}/withdraw', { reason }, { path: { match_id: matchId } }) as Promise<AdminMatch>
}
