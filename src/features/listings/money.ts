/**
 * Listing values are integer minor units (cents for USD) with an ISO 4217 currency
 * (bfb-api docs/LISTINGS.md, "Money"). Forms take major units ("1,500.50") and convert.
 */

/** The API's ceiling: 100,000,000,000 minor units. */
export const MAX_MINOR = 100_000_000_000

const MONEY_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/

/**
 * Major units typed by a person → minor units. `null` for a blank value, `undefined`
 * for something that is not an amount (letters, negative, more than two decimals, over the
 * ceiling). Commas, spaces and a leading `$` are ignored. Exact: no floating point.
 */
export function majorToMinor(input: string): number | null | undefined {
  const cleaned = input.replace(/[\s,]/g, '').replace(/^\$/, '')
  if (cleaned === '') return null
  const match = MONEY_PATTERN.exec(cleaned)
  if (!match) return undefined
  const minor = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
  return Number.isSafeInteger(minor) && minor <= MAX_MINOR ? minor : undefined
}

/** Minor units → the major-unit text a form field shows: `150000` → `"1500"`, `150050` → `"1500.50"`. */
export function minorToMajor(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return ''
  const whole = Math.floor(minor / 100)
  const cents = minor % 100
  return cents === 0 ? String(whole) : `${whole}.${String(cents).padStart(2, '0')}`
}

function formatAmount(minor: number, currency: string): string {
  const fractionDigits = minor % 100 === 0 ? 0 : 2
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(minor / 100)
  } catch {
    // An unknown currency code: show the number with the code.
    return `${(minor / 100).toLocaleString('en-US')} ${currency}`
  }
}

/** `$1,500–$3,000`, `$1,500`, or `null` when no value is set. */
export function formatValueRange(min: number | null, max: number | null, currency: string): string | null {
  if (min === null) return null
  if (max === null || max === min) return formatAmount(min, currency)
  return `${formatAmount(min, currency)}–${formatAmount(max, currency)}`
}
