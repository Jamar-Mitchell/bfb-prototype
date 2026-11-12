import type { components } from '../../lib/api/schema'

type Schemas = components['schemas']

const dateTimeFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export function formatDateTime(value: string): string {
  return dateTimeFormat.format(new Date(value))
}

export const PROFILE_STATUS_LABELS: Record<Schemas['ProfileStatus'], string> = {
  draft: 'Draft',
  in_review: 'In review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  suspended: 'Suspended',
}

export const VERIFICATION_STATUS_LABELS: Record<Schemas['VerificationStatus'], string> = {
  unverified: 'Unverified',
  pending: 'Verification pending',
  verified: 'Verified',
  rejected: 'Verification rejected',
}

export const DECISION_LABELS: Record<Schemas['ReviewDecision'], string> = {
  approved: 'Approved',
  changes_requested: 'Changes requested',
}

/** Listing statuses in display order (bfb-api docs/LISTINGS.md). */
export const LISTING_STATUSES = [
  { key: 'draft', label: 'Draft' },
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Paused' },
  { key: 'archived', label: 'Archived' },
] as const

/** Copy for `completeness.missing` keys (bfb-api docs/BUSINESSES.md). Unknown keys show as they are. */
export const COMPLETENESS_LABELS: Record<string, string> = {
  legal_name: 'Legal name',
  description: 'Description',
  industry: 'Industry',
  business_stage: 'Business stage',
  team_size: 'Team size',
  location: 'Location',
  service_area: 'Service area',
  categories: 'Categories',
  logo: 'Logo',
}
