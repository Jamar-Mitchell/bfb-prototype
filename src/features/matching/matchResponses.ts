import type { ApiError } from '../../lib/api/errors'
import type { SessionBusiness } from '../../stores/session'

/**
 * Owners and administrators accept or decline matches (bfb-api docs/MATCHING.md). The API's
 * `can_respond` does not check the role, so screens combine the two.
 */
export function canAnswerMatches(role: SessionBusiness['role']): boolean {
  return role === 'owner' || role === 'administrator'
}

function detail(error: ApiError, key: string): string | null {
  const details = error.details
  if (typeof details !== 'object' || details === null) return null
  const value = (details as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : null
}

/**
 * Why an answer was refused with `409 invalid_match_status`: this business already answered
 * (`details.response`), or the match is no longer open (`details.status`).
 */
export function answerConflictMessage(error: ApiError, otherName: string): string {
  const response = detail(error, 'response')
  if (response === 'accepted') return 'Someone on your team already accepted this match, so nothing was changed.'
  if (response === 'declined') return 'Someone on your team already declined this match, so nothing was changed.'
  switch (detail(error, 'status')) {
    case 'expired':
      return 'This match expired before your answer was saved.'
    case 'withdrawn':
      return 'BFB withdrew this match, so it can no longer be answered.'
    case 'declined':
      return `${otherName} declined this match, so it is closed.`
    case 'accepted':
      return 'This match was already accepted by both businesses.'
    default:
      return 'This match is no longer open, so nothing was changed.'
  }
}
