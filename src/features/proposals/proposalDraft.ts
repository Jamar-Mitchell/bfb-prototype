import type { components } from '../../lib/api/schema'
import type { ProposalTerms, Side } from './proposalsApi'

type Schemas = components['schemas']

// The proposal builder's working copy of a draft's terms (bfb-api docs/PROPOSALS.md, "Terms").
// Every field is present so the editors never deal with "missing"; it is sent whole on every
// save. Money is integer cents.

export type IpTerms = Schemas['IpTerms']
export type CashTiming = Schemas['CashTiming']

export interface DraftService {
  key: string
  offer_id: string | null
  title: string | null
  description: string | null
  deliverables: string[]
  exclusions: string[]
  value_minor: number | null
}

export interface DraftMilestone {
  key: string
  responsible: Side | null
  service_key: string | null
  title: string | null
  description: string | null
  due_date: string | null
  acceptance_criteria: string | null
}

export interface DraftCash {
  payer: Side | null
  amount_minor: number | null
  timing: CashTiming | null
  note: string | null
}

export interface DraftTerms {
  schema_version: 1
  currency: string
  summary: string | null
  start_date: string | null
  end_date: string | null
  sides: { a: { services: DraftService[] }; b: { services: DraftService[] } }
  milestones: DraftMilestone[]
  review_period_days: number | null
  revision_limit: number | null
  cash_adjustment: DraftCash | null
  ip_terms: IpTerms | null
  confidentiality: boolean | null
  cancellation_notice_days: number | null
  notes: string | null
}

/** Draft limits the builder enforces as people type (the API refuses anything beyond them). */
export const LIMITS = {
  summary: 300,
  title: 120,
  text: 4000,
  note: 200,
  services: 20,
  milestones: 50,
  items: 30,
  itemLength: 200,
} as const

export const SIDES: readonly Side[] = ['a', 'b']

export function otherSide(side: Side): Side {
  return side === 'a' ? 'b' : 'a'
}

/** The API's terms with every field filled in, as the builder edits them. */
export function normalizeTerms(terms: ProposalTerms): DraftTerms {
  const services = (side: Side): DraftService[] =>
    (terms.sides?.[side]?.services ?? []).map((service) => ({
      key: service.key,
      offer_id: service.offer_id ?? null,
      title: service.title ?? null,
      description: service.description ?? null,
      deliverables: service.deliverables ?? [],
      exclusions: service.exclusions ?? [],
      value_minor: service.value_minor ?? null,
    }))
  const cash = terms.cash_adjustment
  return {
    schema_version: 1,
    currency: terms.currency ?? 'USD',
    summary: terms.summary ?? null,
    start_date: terms.start_date ?? null,
    end_date: terms.end_date ?? null,
    sides: { a: { services: services('a') }, b: { services: services('b') } },
    milestones: (terms.milestones ?? []).map((milestone) => ({
      key: milestone.key,
      responsible: milestone.responsible ?? null,
      service_key: milestone.service_key ?? null,
      title: milestone.title ?? null,
      description: milestone.description ?? null,
      due_date: milestone.due_date ?? null,
      acceptance_criteria: milestone.acceptance_criteria ?? null,
    })),
    review_period_days: terms.review_period_days ?? null,
    revision_limit: terms.revision_limit ?? null,
    cash_adjustment: cash ? { payer: cash.payer ?? null, amount_minor: cash.amount_minor ?? null, timing: cash.timing ?? null, note: cash.note ?? null } : null,
    ip_terms: terms.ip_terms ?? null,
    confidentiality: terms.confidentiality ?? null,
    cancellation_notice_days: terms.cancellation_notice_days ?? null,
    notes: terms.notes ?? null,
  }
}

/** Text from an input: blank is `null`, so a cleared field counts as not filled in. */
export function textValue(value: string): string | null {
  return value === '' ? null : value
}

function allKeys(terms: DraftTerms): Set<string> {
  return new Set([...terms.sides.a.services, ...terms.sides.b.services, ...terms.milestones].map((item) => item.key))
}

/**
 * A new key for a service (`s`) or milestone (`m`), unique within the terms. Random rather than
 * counted, so a removed item's key is never given to a different one: versions are compared by key.
 */
export function newKey(terms: DraftTerms, prefix: 's' | 'm', random: () => string = () => crypto.randomUUID().slice(0, 8)): string {
  const taken = allKeys(terms)
  let key = `${prefix}-${random()}`
  while (taken.has(key)) key = `${prefix}-${random()}`
  return key
}

export function findService(terms: DraftTerms, key: string | null): { side: Side; service: DraftService; index: number } | null {
  if (!key) return null
  for (const side of SIDES) {
    const index = terms.sides[side].services.findIndex((service) => service.key === key)
    if (index >= 0) return { side, service: terms.sides[side].services[index], index }
  }
  return null
}

export function emptyService(key: string): DraftService {
  return { key, offer_id: null, title: null, description: null, deliverables: [], exclusions: [], value_minor: null }
}

/** An offer as a service: its title, description and deliverables, valued at the low end of its range. */
export function serviceFromOffer(
  key: string,
  offer: { id: string; title: string; description: string | null; deliverables: string[]; value_min_minor: number | null },
): DraftService {
  return {
    key,
    offer_id: offer.id,
    title: offer.title,
    description: offer.description,
    deliverables: offer.deliverables.slice(0, LIMITS.items),
    exclusions: [],
    value_minor: offer.value_min_minor,
  }
}

export function addService(terms: DraftTerms, side: Side, service: DraftService): DraftTerms {
  return { ...terms, sides: { ...terms.sides, [side]: { services: [...terms.sides[side].services, service] } } }
}

export function updateService(terms: DraftTerms, side: Side, key: string, change: Partial<DraftService>): DraftTerms {
  return {
    ...terms,
    sides: { ...terms.sides, [side]: { services: terms.sides[side].services.map((service) => (service.key === key ? { ...service, ...change } : service)) } },
  }
}

/** Removes a service. Milestones that belonged to it become general milestones. */
export function removeService(terms: DraftTerms, side: Side, key: string): DraftTerms {
  return {
    ...terms,
    sides: { ...terms.sides, [side]: { services: terms.sides[side].services.filter((service) => service.key !== key) } },
    milestones: terms.milestones.map((milestone) => (milestone.service_key === key ? { ...milestone, service_key: null } : milestone)),
  }
}

export function emptyMilestone(key: string, responsible: Side | null): DraftMilestone {
  return { key, responsible, service_key: null, title: null, description: null, due_date: null, acceptance_criteria: null }
}

export function addMilestone(terms: DraftTerms, milestone: DraftMilestone): DraftTerms {
  return { ...terms, milestones: [...terms.milestones, milestone] }
}

/**
 * Changes a milestone. Changing who delivers it drops a service of the other business: a
 * milestone's service must belong to the business responsible for it.
 */
export function updateMilestone(terms: DraftTerms, key: string, change: Partial<DraftMilestone>): DraftTerms {
  return {
    ...terms,
    milestones: terms.milestones.map((milestone) => {
      if (milestone.key !== key) return milestone
      const next = { ...milestone, ...change }
      const service = findService(terms, next.service_key)
      if (service && next.responsible && service.side !== next.responsible) next.service_key = null
      return next
    }),
  }
}

export function removeMilestone(terms: DraftTerms, key: string): DraftTerms {
  return { ...terms, milestones: terms.milestones.filter((milestone) => milestone.key !== key) }
}

/** Moves a milestone one place up (`-1`) or down (`1`). Out of range does nothing. */
export function moveMilestone(terms: DraftTerms, key: string, by: -1 | 1): DraftTerms {
  const from = terms.milestones.findIndex((milestone) => milestone.key === key)
  const to = from + by
  if (from < 0 || to < 0 || to >= terms.milestones.length) return terms
  const milestones = [...terms.milestones]
  ;[milestones[from], milestones[to]] = [milestones[to], milestones[from]]
  return { ...terms, milestones }
}

/** The total value of what one business provides: the sum of the values entered. */
export function sideTotal(terms: DraftTerms, side: Side): number {
  return terms.sides[side].services.reduce((total, service) => total + (service.value_minor ?? 0), 0)
}

export interface ValueComparison {
  totals: Record<Side, number>
  /** How much more the higher side provides; 0 when equal. */
  difference: number
  /** The side that provides more, or `null` when the totals are equal. */
  higher: Side | null
  /** Services with no value entered yet, per side. */
  unvalued: Record<Side, number>
}

/** Each business's total and the difference. Amounts only: no judgement of the trade. */
export function compareValues(terms: DraftTerms): ValueComparison {
  const totals = { a: sideTotal(terms, 'a'), b: sideTotal(terms, 'b') }
  const unvalued = {
    a: terms.sides.a.services.filter((service) => !service.value_minor).length,
    b: terms.sides.b.services.filter((service) => !service.value_minor).length,
  }
  const difference = Math.abs(totals.a - totals.b)
  return { totals, difference, higher: difference === 0 ? null : totals.a > totals.b ? 'a' : 'b', unvalued }
}

/** A cash adjustment for the difference: the business that provides less pays it. Timing is left to choose. */
export function cashForDifference(comparison: ValueComparison): DraftCash | null {
  if (!comparison.higher) return null
  return { payer: otherSide(comparison.higher), amount_minor: comparison.difference, timing: null, note: null }
}
