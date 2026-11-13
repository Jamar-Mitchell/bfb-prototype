import type { AdminMatch } from './matchesApi'

export interface FeedbackEntry {
  key: string
  business: string | null
  label: string | null
  text: string | null
  at: string | null
}

const TEXT_KEYS = ['comment', 'text', 'notes', 'feedback', 'body', 'message']
const LABEL_KEYS = ['outcome', 'sentiment', 'status', 'kind', 'rating']
const AT_KEYS = ['created_at', 'submitted_at', 'updated_at']

/**
 * Match feedback (API-3.6) as display rows. Its shape is not settled yet, so this reads
 * it defensively: an array, `{ items: [...] }`, or an object keyed by side, with each
 * entry's text, a label and a time if present. Anything unreadable is left out.
 */
export function readFeedback(match: AdminMatch): FeedbackEntry[] | null {
  const raw = match.feedback
  if (raw === undefined || raw === null) return null
  const entries: unknown[] = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.items)
      ? raw.items
      : isRecord(raw)
        ? Object.entries(raw).map(([side, value]) => (isRecord(value) ? { side, ...value } : { side, text: value }))
        : []
  return entries.flatMap((entry, index): FeedbackEntry[] => {
    if (typeof entry === 'string') return [{ key: String(index), business: null, label: null, text: entry, at: null }]
    if (!isRecord(entry)) return []
    const text = firstString(entry, TEXT_KEYS)
    const label = firstString(entry, LABEL_KEYS)
    if (!text && !label) return []
    return [{
      key: typeof entry.id === 'string' ? entry.id : String(index),
      business: businessOf(entry, match),
      label: label && humanise(label),
      text,
      at: firstString(entry, AT_KEYS),
    }]
  })
}

function businessOf(entry: Record<string, unknown>, match: AdminMatch): string | null {
  if (entry.side === 'a') return match.business_a.display_name
  if (entry.side === 'b') return match.business_b.display_name
  if (entry.business_id === match.business_a.id) return match.business_a.display_name
  if (entry.business_id === match.business_b.id) return match.business_b.display_name
  if (isRecord(entry.business) && typeof entry.business.display_name === 'string') return entry.business.display_name
  return null
}

function firstString(entry: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = entry[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

function humanise(value: string): string {
  const words = value.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
