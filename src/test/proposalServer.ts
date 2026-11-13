import type { BusinessMatch, MatchBusiness } from '../features/matching/matchInboxApi'
import type { Proposal, ProposalSummary, ProposalTerms } from '../features/proposals/proposalsApi'
import { apiBusiness, apiErrorBody, apiMembership, apiUser, tokenBody, type MockHandler, type MockReply, type MockRequest } from './mockApi'

// Proposal fixtures and a fake API for proposal tests. The active business is `business-1`
// (Northstar Digital, side a); the other business is Northside Studio (side b).

export const PROPOSAL_ID = '3c4d5e6f-2222-4b3c-8d4e-0123456789ab'
export const MATCH_ID = '5d6e7f80-3333-4c4d-9e5f-0123456789ab'
export const STUDIO_ID = '6a1f2c3d-1111-4a2b-9c3d-0123456789ab'
export const PROPOSALS = '/businesses/business-1/proposals'
export const PROPOSAL = `${PROPOSALS}/${PROPOSAL_ID}`
export const MATCH = `/businesses/business-1/matches/${MATCH_ID}`

export const studio: MatchBusiness = {
  id: STUDIO_ID,
  display_name: 'Northside Studio',
  profile_status: 'approved',
  logo_url: null,
  location_city: 'Detroit',
  location_region: 'MI',
  location_country: 'US',
  service_area: 'regional',
}
export const northstar: MatchBusiness = { ...studio, id: 'business-1', display_name: 'Northstar Digital' }

export function proposalSummary(overrides: Partial<ProposalSummary> = {}): ProposalSummary {
  return {
    id: PROPOSAL_ID,
    match_id: MATCH_ID,
    status: 'sent',
    my_side: 'a',
    started_by_side: 'b',
    other_business: studio,
    waiting_on: 'us',
    summary: 'Brand sprint in exchange for six months of bookkeeping',
    current_version_number: 1,
    has_draft: false,
    expires_at: '2026-11-27T12:00:00Z',
    closed_at: null,
    created_at: '2026-11-13T12:00:00Z',
    updated_at: '2026-11-13T12:30:00Z',
    ...overrides,
  }
}

/** Terms as the API pre-fills them from a match: one service per offer, everything else empty. */
export function prefilledTerms(overrides: Partial<ProposalTerms> = {}): ProposalTerms {
  return {
    schema_version: 1,
    currency: 'USD',
    summary: null,
    start_date: null,
    end_date: null,
    sides: {
      a: { services: [{ key: 's1', offer_id: 'offer-a', title: 'Brand identity sprint', description: 'Two-week sprint.', deliverables: ['Logo suite'], exclusions: [], value_minor: 300000 }] },
      b: { services: [{ key: 's2', offer_id: 'offer-b', title: 'Monthly bookkeeping', description: null, deliverables: ['Monthly reconciliation'], exclusions: [], value_minor: 270000 }] },
    },
    milestones: [],
    review_period_days: null,
    revision_limit: null,
    cash_adjustment: null,
    ip_terms: null,
    confidentiality: null,
    cancellation_notice_days: null,
    notes: null,
    ...overrides,
  }
}

export const PREFILLED_MISSING = [
  'start_date',
  'end_date',
  'sides.a.milestones',
  'sides.b.milestones',
  'review_period_days',
  'revision_limit',
  'ip_terms',
  'cancellation_notice_days',
]

/** This business's version 1 draft, as returned right after starting. */
export function draftProposal(overrides: Partial<Proposal> = {}, terms: ProposalTerms = prefilledTerms(), missing = PREFILLED_MISSING): Proposal {
  return {
    id: PROPOSAL_ID,
    match_id: MATCH_ID,
    status: 'draft',
    started_by_side: 'a',
    waiting_on: 'us',
    me: { side: 'a', business: northstar },
    other: { side: 'b', business: studio },
    current_version: null,
    draft: {
      version_number: 1,
      revision: 1,
      based_on_version_number: null,
      terms,
      missing,
      created_at: '2026-11-13T12:00:00Z',
      updated_at: '2026-11-13T12:00:00Z',
    },
    versions: [],
    closed_by_side: null,
    expires_at: null,
    closed_at: null,
    created_at: '2026-11-13T12:00:00Z',
    updated_at: '2026-11-13T12:00:00Z',
    ...overrides,
  }
}

export function acceptedMatch(overrides: Partial<BusinessMatch> = {}): BusinessMatch {
  return {
    id: MATCH_ID,
    status: 'accepted',
    source: 'concierge',
    fit_band: 'strong',
    operator_note: null,
    can_respond: false,
    me: { side: 'a', business: northstar, response: 'accepted', responded_at: '2026-11-12T10:00:00Z', responded_by_user_id: null, decline_reason: null, decline_text: null },
    other: { side: 'b', business: studio, response: 'accepted', responded_at: '2026-11-12T11:00:00Z' },
    components: [],
    my_feedback: null,
    expires_at: '2026-11-26T12:00:00Z',
    closed_at: '2026-11-12T11:00:00Z',
    created_at: '2026-11-12T09:00:00Z',
    updated_at: '2026-11-12T11:00:00Z',
    ...overrides,
  }
}

export interface ProposalServerOptions {
  role?: 'owner' | 'administrator' | 'member'
  /** Every proposal the business has; the list filters them like the API does. */
  proposals?: ProposalSummary[]
  proposal?: Proposal
  match?: BusinessMatch
  reply?: (request: MockRequest) => MockReply | Promise<MockReply> | undefined
}

function matchesFilters(item: ProposalSummary, params: { status?: string; waiting_on?: string }): boolean {
  if (params.status && item.status !== params.status) return false
  if (params.waiting_on && item.waiting_on !== params.waiting_on) return false
  return true
}

export function proposalServer({ role = 'owner', proposals = [], proposal = draftProposal(), match = acceptedMatch(), reply }: ProposalServerOptions = {}): MockHandler {
  return async (request) => {
    const custom = await reply?.(request)
    if (custom) return custom
    const { method, url, config } = request
    if (method === 'post' && url === '/auth/refresh') return { status: 200, data: tokenBody('access-2', 'refresh-2') }
    if (method === 'get' && url === '/account') return { status: 200, data: { user: apiUser({ email_verified: true }), memberships: [apiMembership({ role })] } }
    if (method === 'get' && url === '/businesses/business-1') return { status: 200, data: apiBusiness({ profile_status: 'approved', role }) }
    if (method === 'get' && url === '/businesses/business-1/matches') return { status: 200, data: { items: [], next_cursor: null } }
    if (method === 'get' && url === MATCH) return { status: 200, data: match }
    if (method === 'get' && url === PROPOSALS) {
      const params = (config.params ?? {}) as { status?: string; waiting_on?: string }
      return { status: 200, data: { items: proposals.filter((item) => matchesFilters(item, params)), next_cursor: null } }
    }
    if (method === 'get' && url === PROPOSAL) return { status: 200, data: proposal }
    return { status: 404, data: apiErrorBody('not_found') }
  }
}
