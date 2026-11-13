import type { components } from '../../lib/api/schema'

type Schemas = components['schemas']

// Copy for match fit, statuses and responses (bfb-api docs/MATCHING.md). The one place
// that turns fit bands, factor results and reason codes into words, for the admin match
// workspace and the business match screens alike.
//
// Fit is never a number on screen: no percentages, scores or counts of fitting factors.
// Show the band in words and each factor's result and reason.

export type FitBand = Schemas['FitBand']
export type FactorResult = Schemas['FactorResultResponse']
export type MatchStatus = Schemas['MatchStatus']
export type MatchResponse = Schemas['MatchResponse']
export type DeclineReason = Schemas['DeclineReason']

/** A factor's outcome. The API types it as a string; these are the documented values. */
export type FactorOutcome = 'fits' | 'partial' | 'conflict' | 'unknown'

export const FIT_BAND_LABELS: Record<FitBand, string> = {
  strong: 'Strong fit',
  potential: 'Potential fit',
  limited: 'Limited fit',
}

export const FIT_BAND_DESCRIPTIONS: Record<FitBand, string> = {
  strong: 'Same category, nothing works against it, and the two businesses can help each other or most things line up.',
  potential: 'Same category, but some details need confirming or one thing works against it.',
  limited: 'Different categories, or several things work against it.',
}

export const FACTOR_OUTCOME_LABELS: Record<FactorOutcome, string> = {
  fits: 'Fits',
  partial: 'Partial',
  conflict: 'Conflict',
  unknown: 'Needs confirmation',
}

/** Factors in the order the API sends them. */
export const FACTOR_LABELS: Record<string, string> = {
  category: 'Category',
  reciprocal: 'Two-way exchange',
  value: 'Value and budget',
  timeline: 'Timing',
  location: 'Location and delivery',
  capacity: 'Capacity',
  trust: 'Trust',
}

/** One sentence per reason code. `value_close` and `value_apart` depend on `values.position`. */
const REASON_COPY: Record<string, string> = {
  category_match: 'The offer is in the category the need asks for.',
  category_mismatch: 'The offer and the need are in different categories.',
  reciprocal_match: 'Each business offers something the other needs.',
  reciprocal_one_way: 'One-way for now: nothing the other business offers lines up in return.',
  reciprocal_no_listings: 'Confirm whether there is something to offer in return. One side has no active listings to compare.',
  value_overlaps: 'The offer’s value is within the budget.',
  value_close: 'The offer’s value is close to the budget.',
  value_apart: 'The offer’s value is far from the budget.',
  value_missing: 'Confirm value and budget. One of them is not set.',
  value_currency_differs: 'Confirm value and budget. They are in different currencies.',
  timeline_need_ended: 'The need’s end date has passed.',
  timeline_confirm: 'Confirm timing. Availability is described in the offer, not as dates.',
  location_compatible: 'The delivery format suits where the work is wanted.',
  location_same_region: 'Both businesses are in the same region.',
  location_wider_service_area: 'The provider’s service area reaches the client.',
  location_delivery_mismatch: 'The delivery format does not suit where the work is wanted.',
  location_too_far: 'The client is outside the provider’s service area.',
  location_missing: 'Confirm delivery. The offer’s format or the need’s location preference is not set.',
  location_geography_missing: 'Confirm location. A country, region or service area is not set.',
  capacity_available: 'The offer has room for another match.',
  capacity_full: 'The offer has no room for another match.',
  capacity_missing: 'Confirm capacity. The offer does not say how many it can take on.',
  trust_portfolio: 'Both businesses are approved and the provider shows portfolio work.',
  trust_no_portfolio: 'Both businesses are approved. The provider has no portfolio work yet.',
  trust_not_approved: 'One of the businesses is not approved.',
}

const POSITION_COPY: Record<string, Record<string, string>> = {
  value_close: {
    above_budget: 'The offer’s value is a little above the budget.',
    below_budget: 'The offer’s value is a little below the budget.',
  },
  value_apart: {
    above_budget: 'The offer’s value is well above the budget.',
    below_budget: 'The offer’s value is well below the budget.',
  },
}

const OUTCOMES: readonly string[] = ['fits', 'partial', 'conflict', 'unknown']

/** The documented outcome, or `unknown` for anything the API adds later. */
export function factorOutcome(result: string): FactorOutcome {
  return (OUTCOMES.includes(result) ? result : 'unknown') as FactorOutcome
}

export function fitBandLabel(band: string): string {
  return FIT_BAND_LABELS[band as FitBand] ?? 'Fit not known'
}

export function factorLabel(factor: string): string {
  return FACTOR_LABELS[factor] ?? capitalise(factor.replace(/_/g, ' '))
}

/** A sentence explaining the factor's result, in words only. Unknown codes fall back to the outcome. */
export function reasonCopy(factor: Pick<FactorResult, 'reason' | 'result' | 'values'>): string {
  const position = typeof factor.values?.position === 'string' ? factor.values.position : null
  const byPosition = position ? POSITION_COPY[factor.reason]?.[position] : undefined
  return byPosition ?? REASON_COPY[factor.reason] ?? `${FACTOR_OUTCOME_LABELS[factorOutcome(factor.result)]}.`
}

export interface FactorCopy {
  factor: string
  label: string
  outcome: FactorOutcome
  outcomeLabel: string
  reason: string
}

/** Everything a screen needs to show one factor result. */
export function describeFactor(factor: FactorResult): FactorCopy {
  const outcome = factorOutcome(factor.result)
  return {
    factor: factor.factor,
    label: factorLabel(factor.factor),
    outcome,
    outcomeLabel: FACTOR_OUTCOME_LABELS[outcome],
    reason: reasonCopy(factor),
  }
}

const REASON_ORDER: FactorOutcome[] = ['fits', 'partial', 'unknown']

/**
 * The top reasons behind a match, for a card: what fits first, then what partly fits, then what
 * needs confirming, across its offer-need pairs in order. One per factor; conflicts are left
 * for the detail page.
 */
export function topReasons(components: Array<{ factors: FactorResult[] }>, limit = 3): FactorCopy[] {
  const all = components.flatMap((component) => component.factors.map(describeFactor))
  const picked: FactorCopy[] = []
  for (const outcome of REASON_ORDER) {
    for (const factor of all) {
      if (picked.length >= limit) return picked
      if (factor.outcome === outcome && !picked.some((item) => item.factor === factor.factor)) picked.push(factor)
    }
  }
  return picked
}

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  proposed: 'Proposed',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
  withdrawn: 'Withdrawn',
}

export const MATCH_RESPONSE_LABELS: Record<MatchResponse, string> = {
  pending: 'Waiting for a response',
  accepted: 'Accepted',
  declined: 'Declined',
}

/** Decline reasons. Seen by staff only, never by the other business. */
export const DECLINE_REASON_LABELS: Record<DeclineReason, string> = {
  not_relevant: 'Not relevant to our business',
  no_capacity: 'We do not have capacity',
  timing: 'The timing does not work',
  budget: 'The value or budget does not work',
  location: 'The location or delivery does not work',
  already_connected: 'We already work with this business',
  other: 'Something else',
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
