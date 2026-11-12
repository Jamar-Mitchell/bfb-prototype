import type { SessionBusiness } from '../../stores/session'
import type { ListingKind } from './listingKinds'
import type { Listing, ListingStatus, ProfileStatus } from './listingsApi'

/**
 * Who may do what with listings, and when a listing may go live (bfb-api docs/LISTINGS.md).
 * The API enforces the same rules; these decide which controls to show and why one is disabled.
 */

/** Owners and administrators create, edit and run commands. Members only read. */
export function canManageListings(role: SessionBusiness['role']): boolean {
  return role === 'owner' || role === 'administrator'
}

export const STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
}

/** The business's review status as the page knows it: `null` while loading, `'unknown'` if it could not be loaded. */
export type KnownProfileStatus = ProfileStatus | null | 'unknown'

const NOT_APPROVED: Record<Exclude<ProfileStatus, 'approved'> | 'loading' | 'unknown', string> = {
  draft: 'Listings go live once your business profile is approved. Submit it for review from your profile.',
  in_review: 'Your business profile is in review. You can publish once it’s approved.',
  changes_requested: 'A reviewer asked for changes to your business profile. You can publish once it’s approved.',
  suspended: 'Your business is suspended, so its listings can’t go live.',
  loading: 'Checking whether your business is approved…',
  unknown: 'We couldn’t check whether your business is approved. Reload the page to try again.',
}

const listFormat = new Intl.ListFormat('en-US', { style: 'long', type: 'conjunction' })

/** `missing_for_publish` keys as one phrase: "a description and a delivery format". */
export function missingPhrase(kind: ListingKind, missing: readonly string[]): string {
  return listFormat.format(missing.map((key) => kind.missingPhrases[key] ?? key.replaceAll('_', ' ')))
}

/** "To publish, add a description and a delivery format." or `null` when nothing is missing. */
export function missingText(kind: ListingKind, missing: readonly string[], verb = 'publish'): string | null {
  if (missing.length === 0) return null
  return `To ${verb}, add ${missingPhrase(kind, missing)}.`
}

/** Why no listing of the business can go live right now, or `null` once it is approved. */
export function approvalBlocker(profileStatus: KnownProfileStatus): string | null {
  return profileStatus === 'approved' ? null : NOT_APPROVED[profileStatus ?? 'loading']
}

/**
 * Why a draft cannot be published (or a paused listing resumed) right now, or `null` if it can.
 * The business must be approved and the listing complete.
 */
export function activationBlocker(kind: ListingKind, listing: Listing, profileStatus: KnownProfileStatus): string | null {
  const verb = listing.status === 'paused' ? 'resume' : 'publish'
  return approvalBlocker(profileStatus) ?? missingText(kind, listing.missing_for_publish, verb)
}
