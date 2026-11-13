import { formatMatchDate } from '../matching/matchInboxDisplay'
import { findService, type CashTiming, type DraftTerms, type IpTerms } from './proposalDraft'
import type { ProposalStatus, ProposalSummary, Side } from './proposalsApi'

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

// ---- Builder copy (FE-4.2) ----

/** Who owns the work. Wording goes through legal review before launch (DESIGN_SIGNOFFS.md row 76). */
export const IP_TERMS_COPY: Record<IpTerms, { label: string; description: string }> = {
  transfer_on_payment_and_completion: {
    label: 'Ownership transfers on completion',
    description: 'Each business owns the work it receives once that work is complete and any cash adjustment is paid.',
  },
  license_to_use: {
    label: 'License to use',
    description: 'Each business keeps ownership of what it makes and gives the other a license to use it.',
  },
  each_keeps_own: {
    label: 'Each keeps its own',
    description: 'Each business keeps ownership of its own work. Nothing is transferred or licensed beyond the deliverables themselves.',
  },
}

export const IP_TERMS_ORDER: IpTerms[] = ['transfer_on_payment_and_completion', 'license_to_use', 'each_keeps_own']

export const CASH_TIMING_LABELS: Record<CashTiming, string> = {
  on_signing: 'When the agreement is signed',
  on_completion: 'When the work is complete',
  per_milestone: 'Split across the milestones',
}

/** The builder's sections, in page order. Missing items link to these. */
export type BuilderSection = 'summary' | 'services' | 'milestones' | 'terms' | 'cash'

export const BUILDER_SECTIONS: Array<{ id: BuilderSection; label: string }> = [
  { id: 'summary', label: 'Summary and dates' },
  { id: 'services', label: 'What each business provides' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'terms', label: 'Terms' },
  { id: 'cash', label: 'Cash adjustment' },
]

export function sectionAnchor(section: BuilderSection): string {
  return `proposal-section-${section}`
}

export interface MissingItem {
  key: string
  text: string
  section: BuilderSection
  /** The element to bring into view: the service or milestone card, or the section. */
  anchor: string
}

/** "Brand identity sprint", or "A service from Harbor Bookkeeping" before it has a title. */
function serviceLabel(terms: DraftTerms, key: string, names: Record<Side, string>): string {
  const found = findService(terms, key)
  if (!found) return 'A service'
  return found.service.title?.trim() || `A service from ${names[found.side]}`
}

function milestoneLabel(terms: DraftTerms, key: string): string {
  const index = terms.milestones.findIndex((milestone) => milestone.key === key)
  if (index < 0) return 'A milestone'
  return terms.milestones[index].title?.trim() || `Milestone ${index + 1}`
}

const SERVICE_FIELDS: Record<string, string> = {
  title: 'add a title',
  deliverables: 'add at least one deliverable, with no blank ones',
  exclusions: 'remove the blank exclusion',
  value: 'add a value above zero',
}

const MILESTONE_FIELDS: Record<string, string> = {
  responsible: 'choose which business delivers it',
  title: 'add a title',
  due_date: 'add a due date',
  due_date_outside_dates: 'the due date is outside the proposal’s start and end dates',
  acceptance_criteria: 'add acceptance criteria',
  service_key: 'choose one of the services of the business that delivers it',
}

const TOP_LEVEL: Record<string, { text: string; section: BuilderSection }> = {
  start_date: { text: 'Add a start date', section: 'summary' },
  end_date: { text: 'Add an end date', section: 'summary' },
  end_date_before_start_date: { text: 'The end date is before the start date', section: 'summary' },
  review_period_days: { text: 'Set a review period of 1 to 30 days', section: 'terms' },
  revision_limit: { text: 'Set a revision limit of 0 to 10', section: 'terms' },
  ip_terms: { text: 'Choose who owns the work', section: 'terms' },
  cancellation_notice_days: { text: 'Set a cancellation notice of 0 to 90 days', section: 'terms' },
  'cash_adjustment.payer': { text: 'Cash adjustment: choose who pays', section: 'cash' },
  'cash_adjustment.amount': { text: 'Cash adjustment: add an amount above zero', section: 'cash' },
  'cash_adjustment.timing': { text: 'Cash adjustment: choose when it is paid', section: 'cash' },
}

/**
 * One of the API's `missing` keys in words, with the section it belongs to. Service and
 * milestone keys name the item by its title. Unknown keys still read as something to finish.
 */
export function describeMissing(key: string, terms: DraftTerms, names: Record<Side, string>): MissingItem {
  const top = TOP_LEVEL[key]
  if (top) return { key, ...top, anchor: sectionAnchor(top.section) }

  const side = /^sides\.(a|b)\.(services|milestones)$/.exec(key)
  if (side) {
    const [, which, kind] = side as unknown as [string, Side, 'services' | 'milestones']
    return kind === 'services'
      ? { key, text: `${names[which]} provides nothing yet: add a service`, section: 'services', anchor: `proposal-side-${which}` }
      : { key, text: `${names[which]} delivers no milestone yet: add one`, section: 'milestones', anchor: sectionAnchor('milestones') }
  }

  const item = /^(services|milestones)\.(.+)\.([a-z_]+)$/.exec(key)
  if (item) {
    const [, kind, itemKey, field] = item
    if (kind === 'services') {
      return { key, text: `${serviceLabel(terms, itemKey, names)}: ${SERVICE_FIELDS[field] ?? 'finish this service'}`, section: 'services', anchor: `proposal-service-${itemKey}` }
    }
    return { key, text: `${milestoneLabel(terms, itemKey)}: ${MILESTONE_FIELDS[field] ?? 'finish this milestone'}`, section: 'milestones', anchor: `proposal-milestone-${itemKey}` }
  }

  return { key, text: 'Something else needs finishing', section: 'summary', anchor: sectionAnchor('summary') }
}
