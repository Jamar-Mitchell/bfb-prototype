import { formatMatchDate } from '../matching/matchInboxDisplay'
import type { ProposalStatus, ProposalSummary } from './proposalsApi'

// Copy for proposals (bfb-api docs/PROPOSALS.md): statuses, whose turn it is and when.
// The one place that turns proposal codes into words, as fitCopy.ts does for matches.

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  countered: 'Countered',
  accepted: 'Accepted',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
}

/**
 * The status pill. A version 1 draft is "Draft" to the business writing it and "Being
 * prepared" to the other one, which cannot see it.
 */
export function proposalStatusLabel(proposal: Pick<ProposalSummary, 'status' | 'waiting_on'>): string {
  if (proposal.status === 'draft' && proposal.waiting_on === 'them') return 'Being prepared'
  return PROPOSAL_STATUS_LABELS[proposal.status]
}

/** "Version 2", or "Not sent yet" before version 1 goes out. */
export function versionLabel(currentVersionNumber: number | null): string {
  return currentVersionNumber ? `Version ${currentVersionNumber}` : 'Not sent yet'
}

/** Whose turn it is, in words. `null` once the proposal is closed or accepted. */
export function waitingOnText(proposal: Pick<ProposalSummary, 'status' | 'waiting_on'>, otherName: string): string | null {
  if (!proposal.waiting_on) return null
  if (proposal.waiting_on === 'us') return proposal.status === 'draft' ? 'Waiting on you to send it' : 'Waiting on you'
  return `Waiting on ${otherName}`
}

export type ProposalTimingTone = 'action' | 'waiting' | 'done' | 'closed'

/** One line on when, e.g. "Respond by 27 Nov". */
export function proposalTiming(proposal: ProposalSummary, now = new Date()): { text: string; tone: ProposalTimingTone } {
  const other = proposal.other_business.display_name
  const expires = proposal.expires_at ? formatMatchDate(proposal.expires_at, now) : null
  const closed = formatMatchDate(proposal.closed_at ?? proposal.updated_at, now)
  switch (proposal.status) {
    case 'draft':
      return proposal.waiting_on === 'us'
        ? { text: `Last edited ${formatMatchDate(proposal.updated_at, now)}`, tone: 'action' }
        : { text: `${other} is writing the first version`, tone: 'waiting' }
    case 'sent':
    case 'countered':
      if (proposal.waiting_on === 'us') return { text: expires ? `Respond by ${expires}` : 'Waiting on your answer', tone: 'action' }
      return { text: expires ? `${other} responds by ${expires}` : `Waiting on ${other}`, tone: 'waiting' }
    case 'accepted':
      return { text: `Both accepted on ${closed}`, tone: 'done' }
    case 'declined':
      return { text: `Declined on ${closed}`, tone: 'closed' }
    case 'withdrawn':
      return { text: `Withdrawn on ${closed}`, tone: 'closed' }
    case 'expired':
      return { text: `Expired on ${closed}`, tone: 'closed' }
  }
}
