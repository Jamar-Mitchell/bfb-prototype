import { formatValueRange } from '../listings/money'
import type { BusinessMatchSummary } from './matchInboxApi'

// Wording for a business's own match screens. Fit copy itself lives in fitCopy.ts.

const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const longDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** "4 Dec", with the year when it is not this year. Takes a timestamp or a `YYYY-MM-DD` date. */
export function formatMatchDate(value: string, now = new Date()): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  return date.getFullYear() === now.getFullYear() ? shortDate.format(date) : longDate.format(date)
}

export type TimingTone = 'action' | 'waiting' | 'done' | 'closed'

/** One line on where a match stands and when, e.g. "Respond by 4 Dec". */
export function matchTiming(match: BusinessMatchSummary, now = new Date()): { text: string; tone: TimingTone } {
  const other = match.other_business.display_name
  const closed = formatMatchDate(match.closed_at ?? match.expires_at, now)
  const expires = formatMatchDate(match.expires_at, now)
  switch (match.status) {
    case 'proposed':
      if (match.can_respond) return { text: `Respond by ${expires}`, tone: 'action' }
      if (match.my_response === 'accepted') return { text: `You accepted. Waiting for ${other} until ${expires}`, tone: 'waiting' }
      return { text: `Open until ${expires}`, tone: 'waiting' }
    case 'accepted':
      return { text: `You both accepted on ${closed}`, tone: 'done' }
    case 'declined':
      return { text: match.my_response === 'declined' ? `You declined on ${closed}` : `${other} declined on ${closed}`, tone: 'closed' }
    case 'expired':
      return { text: `Expired on ${closed} without both answers`, tone: 'closed' }
    case 'withdrawn':
      return { text: `Withdrawn by BFB on ${closed}`, tone: 'closed' }
  }
}

/** A string or number from a component snapshot (`offer` and `need` are free-form in the schema). */
export function snapshotText(snapshot: Record<string, unknown>, key: string): string | null {
  const value = snapshot[key]
  return typeof value === 'string' && value ? value : null
}

function snapshotNumber(snapshot: Record<string, unknown>, key: string): number | null {
  const value = snapshot[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const DELIVERY_LABELS: Record<string, string> = {
  remote: 'Remote',
  in_person: 'In person',
  hybrid: 'Hybrid',
  local: 'Local',
  either: 'Remote or local',
}

/** The value (offer) or budget (need) from a snapshot, e.g. "$1,500–$3,000". */
export function snapshotValue(snapshot: Record<string, unknown>): string | null {
  const currency = snapshotText(snapshot, 'currency') ?? 'USD'
  return formatValueRange(snapshotNumber(snapshot, 'value_min_minor'), snapshotNumber(snapshot, 'value_max_minor'), currency)
}

/** Facts about an offer or a need as it was when the match was made, as short labelled lines. */
export function snapshotFacts(kind: 'offer' | 'need', snapshot: Record<string, unknown>): Array<{ label: string; value: string }> {
  const facts: Array<{ label: string; value: string }> = []
  const value = snapshotValue(snapshot)
  if (value) facts.push({ label: kind === 'offer' ? 'Value' : 'Budget', value })
  if (kind === 'offer') {
    const delivery = snapshotText(snapshot, 'delivery_format')
    if (delivery) facts.push({ label: 'Delivery', value: DELIVERY_LABELS[delivery] ?? delivery })
    const availability = snapshotText(snapshot, 'availability')
    if (availability) facts.push({ label: 'Availability', value: availability })
  } else {
    const location = snapshotText(snapshot, 'location_preference')
    if (location) facts.push({ label: 'Wanted', value: DELIVERY_LABELS[location] ?? location })
    const start = snapshotText(snapshot, 'desired_start_date')
    const end = snapshotText(snapshot, 'desired_end_date')
    if (start || end) facts.push({ label: 'Timing', value: [start && `From ${formatMatchDate(start)}`, end && `until ${formatMatchDate(end)}`].filter(Boolean).join(' ') })
  }
  return facts
}
