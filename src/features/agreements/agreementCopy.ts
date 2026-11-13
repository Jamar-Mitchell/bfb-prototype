import { countryName } from '../businesses/profileFields'
import { ENTITY_TYPE_LABELS, type EntityType } from '../businesses/partyDetails'
import { formatMatchDate } from '../matching/matchInboxDisplay'
import type { Agreement, AgreementParty, AgreementStatus, AgreementSummary, LegalReviewStatus } from './agreementsApi'

// Copy for agreements (bfb-api docs/AGREEMENTS.md): statuses, where an agreement stands and
// the draft banner. The one place that turns agreement codes into words, as proposalCopy.ts
// does for proposals.

/** Shown on every agreement screen while the legal documents are drafts. Do not soften it. */
export const DRAFT_TERMS_BANNER = 'Draft terms, not reviewed by counsel. Not for real exchanges.'

export const AGREEMENT_STATUS_LABELS: Record<AgreementStatus, string> = {
  ready: 'Ready for signers',
  signing: 'Out for signature',
  signed: 'Signed',
  expired: 'Expired',
  voided: 'Voided',
}

export const LEGAL_REVIEW_LABELS: Record<LegalReviewStatus, string> = {
  draft: 'Draft, not reviewed by counsel',
  reviewed: 'Reviewed by counsel',
}

export function isDraftTerms(item: { legal_review_status: LegalReviewStatus }): boolean {
  return item.legal_review_status === 'draft'
}

/** Where the agreement stands, in a sentence or two. */
export function agreementStandingText(agreement: Pick<Agreement, 'status' | 'accepted_version_number' | 'accepted_at' | 'expires_at' | 'updated_at'>, now = new Date()): string {
  const deadline = formatMatchDate(agreement.expires_at, now)
  switch (agreement.status) {
    case 'ready':
      return `Both businesses accepted version ${agreement.accepted_version_number} of the proposal on ${formatMatchDate(agreement.accepted_at, now)}, and BFB prepared this agreement from it. Next, each business names who signs for it. It must be signed by ${deadline}.`
    case 'signing':
      return `Both signers have confirmed and the agreement is out for signature. It must be signed by ${deadline}.`
    case 'signed':
      return 'Both businesses signed this agreement.'
    case 'expired':
      return `This agreement wasn’t signed by ${deadline}, so it expired. To go ahead, start a new proposal from the match.`
    case 'voided':
      return `BFB cancelled this agreement on ${formatMatchDate(agreement.updated_at, now)}. Nobody can sign it.`
  }
}

export type AgreementTimingTone = 'action' | 'waiting' | 'done' | 'closed'

/** One line on when, for the list: "Sign by 13 Dec". */
export function agreementTiming(agreement: AgreementSummary, now = new Date()): { text: string; tone: AgreementTimingTone } {
  switch (agreement.status) {
    case 'ready':
    case 'signing':
      return { text: `Sign by ${formatMatchDate(agreement.expires_at, now)}`, tone: 'action' }
    case 'signed':
      return { text: `Signed on ${formatMatchDate(agreement.updated_at, now)}`, tone: 'done' }
    case 'expired':
      return { text: `Expired on ${formatMatchDate(agreement.expires_at, now)}`, tone: 'closed' }
    case 'voided':
      return { text: `Voided on ${formatMatchDate(agreement.updated_at, now)}`, tone: 'closed' }
  }
}

/** "Limited liability company (LLC)", or the API's value if it is not one we know. */
export function entityTypeLabel(value: string | null): string | null {
  if (!value) return null
  return ENTITY_TYPE_LABELS[value as EntityType] ?? value
}

/** The registered address on one line, with the country by name. */
export function formatAddress(address: AgreementParty['registered_address']): string | null {
  const cityLine = [address.city, [address.region, address.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const parts = [address.line1, address.line2, cityLine, countryName(address.country)].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

