import type { Agreement, AgreementSigner, AgreementSummary, ExchangeTerms, SignerConsent } from '../features/agreements/agreementsApi'
import type { Exchange, ExchangeSummary } from '../features/exchanges/exchangesApi'
import type { BusinessMatch, MatchBusiness } from '../features/matching/matchInboxApi'
import type { Proposal, ProposalSummary, ProposalTerms, SentVersion } from '../features/proposals/proposalsApi'
import { apiBusiness, apiErrorBody, apiMembership, apiUser, tokenBody, type MockHandler, type MockReply, type MockRequest } from './mockApi'

// Proposal fixtures and a fake API for proposal tests. The active business is `business-1`
// (Northstar Digital, side a); the other business is Northside Studio (side b).

export const PROPOSAL_ID = '3c4d5e6f-2222-4b3c-8d4e-0123456789ab'
export const MATCH_ID = '5d6e7f80-3333-4c4d-9e5f-0123456789ab'
export const STUDIO_ID = '6a1f2c3d-1111-4a2b-9c3d-0123456789ab'
export const PROPOSALS = '/businesses/business-1/proposals'
export const PROPOSAL = `${PROPOSALS}/${PROPOSAL_ID}`
export const MATCH = `/businesses/business-1/matches/${MATCH_ID}`
export const AGREEMENT_ID = '8a1b2c3d-4444-4d5e-8f60-0123456789ab'
export const AGREEMENTS = '/businesses/business-1/agreements'
export const AGREEMENT = `${AGREEMENTS}/${AGREEMENT_ID}`
export const TERMS_VERSION = '2026-11-draft-1'
export const EXCHANGE_ID = '4c5d6e7f-5555-4e6f-9a70-0123456789ab'
export const EXCHANGES = '/businesses/business-1/exchanges'
export const EXCHANGE = `${EXCHANGES}/${EXCHANGE_ID}`

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
    accepted_version_number: null,
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
    accepted_version_number: null,
    agreement_source_id: null,
    agreement: null,
    expires_at: null,
    closed_at: null,
    created_at: '2026-11-13T12:00:00Z',
    updated_at: '2026-11-13T12:00:00Z',
    ...overrides,
  }
}

/** Complete terms, ready to send. Milestones are deliberately not in date order. */
export function completeTerms(overrides: Partial<ProposalTerms> = {}): ProposalTerms {
  return prefilledTerms({
    summary: 'Brand sprint in exchange for six months of bookkeeping',
    start_date: '2027-01-04',
    end_date: '2027-06-30',
    sides: {
      a: { services: [{ key: 's1', offer_id: 'offer-a', title: 'Brand identity sprint', description: 'Two-week sprint.', deliverables: ['Logo suite', 'Brand guide'], exclusions: ['Printing'], value_minor: 300000 }] },
      b: { services: [{ key: 's2', offer_id: 'offer-b', title: 'Monthly bookkeeping', description: null, deliverables: ['Monthly reconciliation'], exclusions: [], value_minor: 270000 }] },
    },
    milestones: [
      { key: 'm2', responsible: 'b', service_key: 's2', title: 'January books closed', description: null, due_date: '2027-02-10', acceptance_criteria: 'Reconciled ledger shared' },
      { key: 'm1', responsible: 'a', service_key: 's1', title: 'Logo concepts', description: null, due_date: '2027-01-18', acceptance_criteria: 'Three concepts delivered as PDF' },
    ],
    review_period_days: 5,
    revision_limit: 2,
    cash_adjustment: { payer: 'b', amount_minor: 30000, timing: 'on_completion', note: null },
    ip_terms: 'transfer_on_payment_and_completion',
    confidentiality: true,
    cancellation_notice_days: 14,
    ...overrides,
  })
}

export function sentVersion(overrides: Partial<SentVersion> = {}): SentVersion {
  return {
    version_number: 1,
    author_side: 'b',
    sent_at: '2026-11-13T12:30:00Z',
    expires_at: '2026-11-27T12:30:00Z',
    accepted_by: ['b'],
    is_current: true,
    based_on_version_number: null,
    terms: completeTerms(),
    ...overrides,
  }
}

/**
 * A sent proposal. By default Northside Studio (side b) sent version 1 and it is this
 * business's turn; pass `current_version: sentVersion({ author_side: 'a', ... })` and
 * `waiting_on: 'them'` for one this business sent.
 */
export function sentProposal(overrides: Partial<Proposal> = {}): Proposal {
  const current = overrides.current_version ?? sentVersion()
  const { terms: _terms, based_on_version_number: _based, ...summary } = current
  return draftProposal({
    status: current.version_number > 1 ? 'countered' : 'sent',
    started_by_side: 'b',
    waiting_on: current.author_side === 'a' ? 'them' : 'us',
    current_version: current,
    draft: null,
    versions: [summary],
    expires_at: current.expires_at,
    updated_at: current.sent_at,
    ...overrides,
  })
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
    proposal: null,
    expires_at: '2026-11-26T12:00:00Z',
    closed_at: '2026-11-12T11:00:00Z',
    created_at: '2026-11-12T09:00:00Z',
    updated_at: '2026-11-12T11:00:00Z',
    ...overrides,
  }
}

const address = { line1: '1 Main Street', line2: null, city: 'Detroit', region: 'MI', postal_code: '48201', country: 'US' }

/** The consent wording a signer confirms, as the API returns it on the agreement. */
export const SIGNER_CONSENT: SignerConsent = {
  version: '2026-11-draft-1',
  authority: 'I confirm that the name and title above are mine and correct, and that I am authorized to sign this agreement on behalf of the business named as my party, and to bind that business to it.',
  esign_consent: 'DRAFT — not reviewed by counsel. Not for real exchanges. I agree to use electronic records and electronic signatures for this agreement.',
  is_draft: true,
}

/**
 * A named signer. Side a (Northstar Digital) defaults to the logged-in user, Alex Morgan; side b
 * to Sam Lee of Northside Studio.
 */
export function signer(side: 'a' | 'b', overrides: Partial<AgreementSigner> = {}): AgreementSigner {
  const a = side === 'a'
  return {
    id: `signer-${side}`,
    side,
    business_id: a ? 'business-1' : STUDIO_ID,
    user_id: a ? 'user-1' : 'user-studio',
    full_name: a ? 'Alex Morgan' : 'Sam Lee',
    title: null,
    email: a ? 'founder@example.com' : 'sam@studio.example',
    status: 'pending',
    named_at: '2026-11-17T12:00:00Z',
    confirmed: false,
    authority_confirmed_at: null,
    esign_consent_at: null,
    consent_text_version: null,
    signed_at: null,
    ...overrides,
  }
}

/** A signer who confirmed name, title, authority and consent. */
export function confirmedSigner(side: 'a' | 'b', overrides: Partial<AgreementSigner> = {}): AgreementSigner {
  return signer(side, {
    title: side === 'a' ? 'Founder' : 'Studio Director',
    confirmed: true,
    authority_confirmed_at: '2026-11-18T12:00:00Z',
    esign_consent_at: '2026-11-18T12:00:00Z',
    consent_text_version: SIGNER_CONSENT.version,
    ...overrides,
  })
}

/** The agreement generated when both businesses accepted version 1. Northstar Digital is side a. */
export function agreementDetail(overrides: Partial<Agreement> = {}): Agreement {
  return {
    id: AGREEMENT_ID,
    status: 'ready',
    proposal_id: PROPOSAL_ID,
    match_id: MATCH_ID,
    agreement_source_id: 'source-1',
    accepted_version_number: 1,
    accepted_at: '2026-11-16T12:00:00Z',
    my_side: 'a',
    parties: [
      { side: 'a', business_id: 'business-1', display_name: 'Northstar Digital', legal_name: 'Northstar Digital LLC', entity_type: 'llc', registered_address: address, accepted_at: '2026-11-15T12:00:00Z' },
      { side: 'b', business_id: STUDIO_ID, display_name: 'Northside Studio', legal_name: 'Northside Studio Inc.', entity_type: 'corporation', registered_address: { ...address, line1: '9 River Road' }, accepted_at: '2026-11-16T12:00:00Z' },
    ],
    template: { version: '2026-11-draft-1', legal_review_status: 'draft', content_sha256: 'b'.repeat(64) },
    exchange_terms: { version: TERMS_VERSION, legal_review_status: 'draft', content_sha256: 'c'.repeat(64) },
    legal_review_status: 'draft',
    content_sha256: '4f0e'.repeat(16),
    html: '<!DOCTYPE html><html lang="en"><body><h1>Business Exchange Agreement</h1></body></html>',
    signers: [],
    signer_consent: SIGNER_CONSENT,
    signature_provider: null,
    signing_started_at: null,
    signed_at: null,
    voided_at: null,
    void_reason: null,
    exchange: null,
    signed_document: null,
    generated_at: '2026-11-16T12:00:00Z',
    expires_at: '2026-12-16T12:00:00Z',
    created_at: '2026-11-16T12:00:00Z',
    updated_at: '2026-11-16T12:00:00Z',
    ...overrides,
  }
}

export function agreementSummary(overrides: Partial<AgreementSummary> = {}): AgreementSummary {
  return {
    id: AGREEMENT_ID,
    status: 'ready',
    proposal_id: PROPOSAL_ID,
    match_id: MATCH_ID,
    my_side: 'a',
    other_business: studio,
    legal_review_status: 'draft',
    content_sha256: '4f0e'.repeat(16),
    expires_at: '2026-12-16T12:00:00Z',
    created_at: '2026-11-16T12:00:00Z',
    updated_at: '2026-11-16T12:00:00Z',
    ...overrides,
  }
}

export function exchangeTerms(overrides: Partial<ExchangeTerms> = {}): ExchangeTerms {
  return {
    kind: 'exchange_terms',
    version: TERMS_VERSION,
    legal_review_status: 'draft',
    is_current: true,
    content_sha256: 'c'.repeat(64),
    published_at: '2026-11-13T18:00:00Z',
    body: '# BFB Exchange Terms',
    html: '<h1>BFB Exchange Terms</h1>\n<h2>1. How these terms work</h2>\n<p>These terms apply to every exchange.</p>',
    ...overrides,
  }
}

/** The agreement once both businesses signed: the exchange is active and the documents are stored. */
export function signedAgreement(overrides: Partial<Agreement> = {}): Agreement {
  return agreementDetail({
    status: 'signed',
    signature_provider: 'development',
    signing_started_at: '2026-11-19T12:00:00Z',
    signed_at: '2026-11-20T12:00:00Z',
    signers: [
      confirmedSigner('a', { status: 'signed', signed_at: '2026-11-20T12:00:00Z' }),
      confirmedSigner('b', { status: 'signed', signed_at: '2026-11-19T15:00:00Z' }),
    ],
    exchange: { id: EXCHANGE_ID, status: 'active' },
    signed_document: { content_type: 'text/html; charset=utf-8', document_sha256: '7d1e'.repeat(16), certificate_sha256: '9a2b'.repeat(16), created_at: '2026-11-20T12:00:00Z' },
    ...overrides,
  })
}

export function exchangeSummary(overrides: Partial<ExchangeSummary> = {}): ExchangeSummary {
  return {
    id: EXCHANGE_ID,
    status: 'active',
    agreement_id: AGREEMENT_ID,
    proposal_id: PROPOSAL_ID,
    match_id: MATCH_ID,
    my_side: 'a',
    other_business: studio,
    milestone_count: 3,
    next_due_date: '2027-01-18',
    activated_at: '2026-11-20T12:00:00Z',
    created_at: '2026-11-20T12:00:00Z',
    updated_at: '2026-11-20T12:00:00Z',
    ...overrides,
  }
}

/** An active exchange: Northstar Digital (side a) delivers milestones 1 and 3, Northside Studio milestone 2. */
export function exchangeDetail(overrides: Partial<Exchange> = {}): Exchange {
  const milestone = (sequence: number, side: 'a' | 'b', title: string, due: string | null, extra: Partial<Exchange['milestones'][number]> = {}) => ({
    id: `milestone-${sequence}`,
    sequence,
    key: `m${sequence}`,
    service_key: side === 'a' ? 's1' : 's2',
    responsible_side: side,
    responsible_business_id: side === 'a' ? 'business-1' : STUDIO_ID,
    receiving_business_id: side === 'a' ? STUDIO_ID : 'business-1',
    title,
    description: null,
    due_date: due,
    acceptance_criteria: null,
    status: 'pending' as const,
    ...extra,
  })
  return {
    ...exchangeSummary(),
    business_a_id: 'business-1',
    business_b_id: STUDIO_ID,
    milestones: [
      milestone(1, 'a', 'Logo concepts', '2027-01-18', { acceptance_criteria: 'Three concepts delivered as PDF' }),
      milestone(2, 'b', 'First monthly reconciliation', '2027-02-10', { description: 'January books closed.' }),
      milestone(3, 'a', 'Final brand guide', null),
    ],
    ...overrides,
  }
}

export interface ProposalServerOptions {
  role?: 'owner' | 'administrator' | 'member'
  /** Every proposal the business has; the list filters them like the API does. */
  proposals?: ProposalSummary[]
  proposal?: Proposal
  match?: BusinessMatch
  /** Every agreement the business has; the list filters them like the API does. */
  agreements?: AgreementSummary[]
  agreement?: Agreement
  /** The business's active exchanges, and the one exchange the detail route returns. */
  exchanges?: ExchangeSummary[]
  exchange?: Exchange
  reply?: (request: MockRequest) => MockReply | Promise<MockReply> | undefined
}

function matchesFilters(item: ProposalSummary, params: { status?: string; waiting_on?: string }): boolean {
  if (params.status && item.status !== params.status) return false
  if (params.waiting_on && item.waiting_on !== params.waiting_on) return false
  return true
}

export function proposalServer({ role = 'owner', proposals = [], proposal = draftProposal(), match = acceptedMatch(), agreements = [], agreement = agreementDetail(), exchanges = [], exchange = exchangeDetail(), reply }: ProposalServerOptions = {}): MockHandler {
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
    if (method === 'get' && url === AGREEMENTS) {
      const status = (config.params as { status?: string } | undefined)?.status
      return { status: 200, data: { items: agreements.filter((item) => !status || item.status === status), next_cursor: null } }
    }
    if (method === 'get' && url === `${AGREEMENTS}/${agreement.id}`) return { status: 200, data: agreement }
    if (method === 'get' && url === EXCHANGES) return { status: 200, data: { items: exchanges, next_cursor: null } }
    if (method === 'get' && url === `${EXCHANGES}/${exchange.id}`) return { status: 200, data: exchange }
    if (method === 'get' && url === '/legal/exchange-terms') return { status: 200, data: exchangeTerms() }
    return { status: 404, data: apiErrorBody('not_found') }
  }
}
