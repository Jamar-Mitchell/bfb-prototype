import { formatAmount } from '../listings/money'
import { CASH_TIMING_LABELS, days, formatFullDate, IP_TERMS_COPY } from './proposalCopy'
import { findService, otherSide, type CashTiming, type DraftTerms, type IpTerms } from './proposalDraft'
import type { Side, TermsChange } from './proposalsApi'

// Words for the API's version changes (bfb-api docs/PROPOSALS.md, "Changes"). The API compares
// the versions; this only says each change in words, with before and after values.

export interface ChangeContext {
  names: Record<Side, string>
  currency: string
  /** The newer version's terms, to name the service or milestone a change belongs to. */
  terms: DraftTerms
}

export interface DescribedChange {
  kind: TermsChange['kind']
  /** What changed: "End date", "Brand identity sprint (Northstar Digital): Value". */
  subject: string
  /** Before and after, in words, for an edited field. */
  before?: string
  after?: string
  /** For an added or removed item: the item in one line. */
  summary?: string
}

export const CHANGE_KIND_LABELS: Record<TermsChange['kind'], string> = {
  added: 'Added',
  removed: 'Removed',
  changed: 'Changed',
}

const TERMS_FIELDS: Record<string, string> = {
  currency: 'Currency',
  summary: 'Summary',
  start_date: 'Start date',
  end_date: 'End date',
  review_period_days: 'Review period',
  revision_limit: 'Revision rounds',
  ip_terms: 'Who owns the work',
  confidentiality: 'Confidentiality',
  cancellation_notice_days: 'Cancellation notice',
  notes: 'Notes',
}

const SERVICE_FIELDS: Record<string, string> = {
  offer_id: 'Linked offer',
  title: 'Title',
  description: 'Description',
  deliverables: 'Deliverables',
  exclusions: 'Not included',
  value_minor: 'Value',
  side: 'Provided by',
}

const MILESTONE_FIELDS: Record<string, string> = {
  responsible: 'Delivered by',
  service_key: 'Part of',
  title: 'Title',
  description: 'Description',
  due_date: 'Due date',
  acceptance_criteria: 'Acceptance criteria',
}

const CASH_FIELDS: Record<string, string> = {
  payer: 'Who pays',
  amount_minor: 'Amount',
  timing: 'When it is paid',
  note: 'Note',
}

type Item = Record<string, unknown>

function asItem(value: unknown): Item {
  return typeof value === 'object' && value !== null ? (value as Item) : {}
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function isSide(value: unknown): value is Side {
  return value === 'a' || value === 'b'
}

/** One field's value in words. Empty values read as "Not set". */
export function formatChangeValue(field: string, value: unknown, context: ChangeContext): string {
  if (value === null || value === undefined || value === '') return 'Not set'
  const money = (minor: unknown) => (typeof minor === 'number' ? formatAmount(minor, context.currency) : String(minor))
  switch (field) {
    case 'value_minor':
    case 'amount_minor':
      return money(value)
    case 'start_date':
    case 'end_date':
    case 'due_date':
      return typeof value === 'string' ? formatFullDate(value) : String(value)
    case 'review_period_days':
    case 'cancellation_notice_days':
      return typeof value === 'number' ? days(value) : String(value)
    case 'ip_terms':
      return IP_TERMS_COPY[value as IpTerms]?.label ?? String(value)
    case 'confidentiality':
      return value ? 'Confidential' : 'No confidentiality clause'
    case 'timing':
      return CASH_TIMING_LABELS[value as CashTiming] ?? String(value)
    case 'side':
    case 'responsible':
    case 'payer':
      return isSide(value) ? context.names[value] : String(value)
    case 'service_key': {
      const found = typeof value === 'string' ? findService(context.terms, value) : null
      return found?.service.title ?? 'Another service'
    }
    case 'offer_id':
      return 'An offer'
    case 'deliverables':
    case 'exclusions':
      return Array.isArray(value) && value.length > 0 ? value.join(', ') : 'None'
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function serviceName(change: TermsChange, context: ChangeContext): string {
  const whole = asItem(change.kind === 'removed' ? change.before : change.after)
  const found = change.key ? findService(context.terms, change.key) : null
  const title = text(whole.title) ?? found?.service.title ?? 'A service'
  const side = change.side ?? found?.side ?? null
  return side ? `${title} (${context.names[side]})` : title
}

function milestoneName(change: TermsChange, context: ChangeContext): string {
  const whole = asItem(change.kind === 'removed' ? change.before : change.after)
  const found = context.terms.milestones.find((milestone) => milestone.key === change.key)
  return text(whole.title) ?? found?.title ?? 'A milestone'
}

function cashSummary(cash: Item, context: ChangeContext): string {
  const payer = isSide(cash.payer) ? cash.payer : null
  const amount = typeof cash.amount_minor === 'number' ? formatAmount(cash.amount_minor, context.currency) : 'an amount'
  const timing = typeof cash.timing === 'string' ? ` ${(CASH_TIMING_LABELS[cash.timing as CashTiming] ?? '').toLowerCase()}` : ''
  return payer ? `${context.names[payer]} pays ${context.names[otherSide(payer)]} ${amount}${timing}` : `${amount}${timing}`
}

function serviceSummary(service: Item, context: ChangeContext): string {
  const parts = [typeof service.value_minor === 'number' ? formatAmount(service.value_minor, context.currency) : 'No value']
  if (Array.isArray(service.deliverables) && service.deliverables.length > 0) parts.push(service.deliverables.join(', '))
  return parts.join(' · ')
}

function milestoneSummary(milestone: Item, context: ChangeContext): string {
  const parts: string[] = []
  if (typeof milestone.due_date === 'string') parts.push(`Due ${formatFullDate(milestone.due_date)}`)
  if (isSide(milestone.responsible)) parts.push(`delivered by ${context.names[milestone.responsible]}`)
  return parts.join(', ') || 'No date or business set'
}

/** One change from the API in words. */
export function describeChange(change: TermsChange, context: ChangeContext): DescribedChange {
  const field = change.field ?? null
  const changed = (subject: string): DescribedChange => ({
    kind: 'changed',
    subject,
    before: formatChangeValue(field ?? '', change.before, context),
    after: formatChangeValue(field ?? '', change.after, context),
  })
  switch (change.item) {
    case 'terms':
      return changed(TERMS_FIELDS[field ?? ''] ?? 'Terms')
    case 'cash_adjustment':
      if (change.kind === 'changed') return changed(`Cash adjustment: ${(CASH_FIELDS[field ?? ''] ?? 'Details').toLowerCase()}`)
      return { kind: change.kind, subject: 'Cash adjustment', summary: cashSummary(asItem(change.kind === 'added' ? change.after : change.before), context) }
    case 'service':
      if (change.kind === 'changed') return changed(`${serviceName(change, context)}: ${(SERVICE_FIELDS[field ?? ''] ?? 'Details').toLowerCase()}`)
      return { kind: change.kind, subject: `Service: ${serviceName(change, context)}`, summary: serviceSummary(asItem(change.kind === 'added' ? change.after : change.before), context) }
    case 'milestone':
      if (change.kind === 'changed') return changed(`${milestoneName(change, context)}: ${(MILESTONE_FIELDS[field ?? ''] ?? 'Details').toLowerCase()}`)
      return { kind: change.kind, subject: `Milestone: ${milestoneName(change, context)}`, summary: milestoneSummary(asItem(change.kind === 'added' ? change.after : change.before), context) }
  }
}
