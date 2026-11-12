import type { SessionBusiness } from '../../stores/session'

export const ROLE_LABELS: Record<SessionBusiness['role'], string> = {
  owner: 'Owner',
  administrator: 'Administrator',
  member: 'Member',
}

/**
 * Up to two letters: the first letters of the first two words, or the first two letters of a
 * single word. Words without a letter or digit (such as "&") are skipped.
 */
export function businessInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word))
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '').slice(0, 2)
  return letters.toUpperCase() || '?'
}
