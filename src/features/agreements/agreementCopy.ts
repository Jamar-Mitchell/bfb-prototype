import { countryName } from '../businesses/profileFields'
import { ENTITY_TYPE_LABELS, type EntityType } from '../businesses/partyDetails'
import { formatMatchDate } from '../matching/matchInboxDisplay'
import type { ApiError } from '../../lib/api/errors'
import type { Agreement, AgreementParty, AgreementSigner, AgreementStatus, AgreementSummary, LegalReviewStatus } from './agreementsApi'

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


// Signers and signing (FE-5.2).

/** Where one business's signer is: not named, named but not confirmed, confirmed, signed or declined. */
export type SignerStep = 'not_named' | 'named' | 'confirmed' | 'signed' | 'declined'

export function signerStep(signer: AgreementSigner | null): SignerStep {
  if (!signer) return 'not_named'
  if (signer.status === 'signed') return 'signed'
  if (signer.status === 'declined') return 'declined'
  return signer.confirmed ? 'confirmed' : 'named'
}

export const SIGNER_STEP_LABELS: Record<SignerStep, string> = {
  not_named: 'No signer yet',
  named: 'Waiting to confirm',
  confirmed: 'Confirmed',
  signed: 'Signed',
  declined: 'Declined',
}

/** One line under a signer's name: when they were named, confirmed or signed. */
export function signerStepDetail(signer: AgreementSigner | null, now = new Date()): string {
  switch (signerStep(signer)) {
    case 'not_named':
      return 'Nobody is named to sign yet.'
    case 'named':
      return `Named on ${formatMatchDate(signer!.named_at, now)}. Hasn’t confirmed yet.`
    case 'confirmed':
      return `Confirmed on ${formatMatchDate(signer!.authority_confirmed_at ?? signer!.named_at, now)}.`
    case 'signed':
      return `Signed on ${formatMatchDate(signer!.signed_at ?? signer!.named_at, now)}.`
    case 'declined':
      return 'Declined to sign.'
  }
}

/** "Dana Rivers, Managing Director". */
export function signerLine(signer: Pick<AgreementSigner, 'full_name' | 'title'>): string {
  return signer.title ? `${signer.full_name}, ${signer.title}` : signer.full_name
}

function detail(error: ApiError, key: string): string | null {
  const details = error.details as Record<string, unknown> | null | undefined
  const value = details?.[key]
  return typeof value === 'string' ? value : null
}

/** Refusals that mean the agreement or the caller's place in it changed: the page reloads and says why. */
export function isSigningConflict(error: ApiError): boolean {
  if (error.code === 'signer_confirmation_required') return consentVersionChanged(error)
  return ['invalid_agreement_status', 'not_agreement_signer', 'business_role_required', 'not_found'].includes(error.code)
}

/** The consent wording changed since the page loaded (`consent_text_version` in `missing`). */
export function consentVersionChanged(error: ApiError): boolean {
  const missing = (error.details as { missing?: unknown } | null | undefined)?.missing
  return Array.isArray(missing) && missing.includes('consent_text_version')
}

/** Why the page reloaded after a signing action was refused. */
export function signingConflictText(error: ApiError): string {
  switch (error.code) {
    case 'invalid_agreement_status':
      switch (detail(error, 'reason')) {
        case 'signing_started':
          return 'Signing has started, so the signers can’t be changed any more. Nothing changed, and the page shows the agreement as it is now.'
        case 'not_signing':
          return 'Signing hasn’t started yet: both signers must confirm first. The page shows the agreement as it is now.'
        case 'already_signed':
          return 'You’ve already signed this agreement. The page shows it as it is now.'
        case 'signer_declined':
          return 'Your business’s signer declined, so your business can’t sign this agreement.'
        case 'not_in_app':
          return 'This agreement is signed with the signature provider, not on BFB. Follow the link it sent you.'
        default:
          return 'This agreement closed since you opened it (signed, expired or voided), so nothing changed.'
      }
    case 'not_agreement_signer':
      return 'You’re no longer the signer named for your business, so nothing changed. The page shows who signs now.'
    case 'business_role_required':
      return 'Only owners and administrators can name who signs, and your role no longer allows it. Nothing changed.'
    case 'signer_confirmation_required':
      return 'The consent wording changed since you opened the page. Read it again below, then confirm.'
    case 'not_found':
      return 'Your business is no longer part of this agreement, or it was removed.'
    default:
      return error.userMessage
  }
}

/** Why someone can't be named as the signer (`422 invalid_signer`). */
export function invalidSignerText(error: ApiError, businessName: string): string {
  return detail(error, 'reason') === 'not_a_member'
    ? `That person is no longer a member of ${businessName}. Choose someone else.`
    : `That person is no longer an owner or administrator of ${businessName}, so they can’t sign for it. Choose someone else.`
}
