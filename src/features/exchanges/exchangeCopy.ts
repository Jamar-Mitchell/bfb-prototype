import type { ExchangeMilestone, ExchangeStatus } from './exchangesApi'

// Copy for exchanges: the one place that turns exchange codes into words.

export const EXCHANGE_STATUS_LABELS: Record<ExchangeStatus, string> = {
  active: 'Active',
}

export const MILESTONE_STATUS_LABELS: Record<ExchangeMilestone['status'], string> = {
  pending: 'Not started',
}

/** "3 milestones", "1 milestone". */
export function milestoneCount(count: number): string {
  return count === 1 ? '1 milestone' : `${count} milestones`
}

/** Who delivers a milestone to whom, from the active business's point of view. */
export function deliveryLine(milestone: ExchangeMilestone, myBusinessId: string, names: { mine: string; other: string }): { text: string; mine: boolean } {
  const mine = milestone.responsible_business_id === myBusinessId
  return mine
    ? { text: `${names.mine} delivers to ${names.other}`, mine }
    : { text: `${names.other} delivers to ${names.mine}`, mine }
}
