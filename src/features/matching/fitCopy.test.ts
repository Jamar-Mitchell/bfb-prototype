import { describe, expect, it } from 'vitest'

import { describeFactor, FACTOR_LABELS, factorOutcome, fitBandLabel, reasonCopy } from './fitCopy'

const REASONS = [
  'category_match', 'category_mismatch',
  'reciprocal_match', 'reciprocal_one_way', 'reciprocal_no_listings',
  'value_overlaps', 'value_close', 'value_apart', 'value_missing', 'value_currency_differs',
  'timeline_need_ended', 'timeline_confirm',
  'location_compatible', 'location_same_region', 'location_wider_service_area', 'location_delivery_mismatch', 'location_too_far', 'location_missing', 'location_geography_missing',
  'capacity_available', 'capacity_full', 'capacity_missing',
  'trust_portfolio', 'trust_no_portfolio', 'trust_not_approved',
]

describe('fit copy', () => {
  it('names bands in words', () => {
    expect(fitBandLabel('strong')).toBe('Strong fit')
    expect(fitBandLabel('potential')).toBe('Potential fit')
    expect(fitBandLabel('limited')).toBe('Limited fit')
  })

  it('has a sentence without numbers for every documented reason', () => {
    for (const reason of REASONS) {
      const copy = reasonCopy({ reason, result: 'fits', values: { offer_min_minor: 300000, capacity: 2 } })
      expect(copy, reason).not.toBe('Fits.')
      expect(copy, reason).not.toMatch(/\d/)
    }
  })

  it('uses the budget position for value results', () => {
    expect(reasonCopy({ reason: 'value_apart', result: 'conflict', values: { position: 'below_budget' } })).toBe('The offer’s value is well below the budget.')
    expect(reasonCopy({ reason: 'value_close', result: 'partial', values: { position: 'above_budget' } })).toBe('The offer’s value is a little above the budget.')
  })

  it('labels outcomes and factors, falling back for new codes', () => {
    expect(Object.keys(FACTOR_LABELS)).toEqual(['category', 'reciprocal', 'value', 'timeline', 'location', 'capacity', 'trust'])
    expect(describeFactor({ factor: 'timeline', result: 'unknown', reason: 'timeline_confirm', values: {} })).toMatchObject({
      label: 'Timing',
      outcomeLabel: 'Needs confirmation',
    })
    expect(factorOutcome('surprising')).toBe('unknown')
    expect(describeFactor({ factor: 'new_factor', result: 'conflict', reason: 'new_reason', values: {} })).toMatchObject({
      label: 'New factor',
      outcomeLabel: 'Conflict',
      reason: 'Conflict.',
    })
  })
})
