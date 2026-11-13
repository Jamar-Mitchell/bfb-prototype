import { BusinessLogo } from '../businesses/BusinessLogo'
import { formatLocation } from '../businesses/profileLabels'
import { MATCH_RESPONSE_LABELS, MATCH_STATUS_LABELS, type MatchResponse, type MatchStatus } from '../matching/fitCopy'
import type { MatchBusiness } from './matchesApi'

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

/** A calendar date (`YYYY-MM-DD`) or a timestamp, as a date. */
export function formatDate(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  return dateFormat.format(date)
}

/** Logo or initials (the shared `BusinessLogo`). */
export function BusinessMark({ business }: { business: Pick<MatchBusiness, 'display_name' | 'logo_url'> }) {
  return <BusinessLogo business={business} size="small" />
}

export function businessPlace(business: MatchBusiness): string {
  return formatLocation(business) || 'Location not given'
}

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  return <span className={`admin-status match-status-${status}`}>{MATCH_STATUS_LABELS[status]}</span>
}

/** A business's response; "No response" once a match closed without one. */
export function responseLabel(response: MatchResponse, status: MatchStatus): string {
  return response === 'pending' && status !== 'proposed' ? 'No response' : MATCH_RESPONSE_LABELS[response]
}
