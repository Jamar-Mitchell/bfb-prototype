import type { components } from '../../lib/api/schema'
import { majorToMinor } from '../listings/money'

export type MarketplaceKind = components['schemas']['MarketplaceKind']
export type Delivery = components['schemas']['Delivery']

/**
 * The marketplace search as it lives in the URL query, so a search can be shared and survives
 * a reload. Values are in dollars (major units) in the URL; the API takes minor units.
 */
export interface MarketplaceFilters {
  kind: MarketplaceKind | null
  categoryIds: string[]
  q: string
  delivery: Delivery[]
  country: string
  region: string
  /** Major units as typed, e.g. "1500". */
  valueMin: string
  valueMax: string
}

export const emptyFilters: MarketplaceFilters = {
  kind: null,
  categoryIds: [],
  q: '',
  delivery: [],
  country: '',
  region: '',
  valueMin: '',
  valueMax: '',
}

/** Delivery choices: offer delivery formats and need location preferences (bfb-api docs/MARKETPLACE.md). */
export const DELIVERY_OPTIONS: Array<{ value: Delivery; label: string; kinds: MarketplaceKind[] }> = [
  { value: 'remote', label: 'Remote', kinds: ['offer', 'need'] },
  { value: 'in_person', label: 'In person', kinds: ['offer'] },
  { value: 'hybrid', label: 'Hybrid', kinds: ['offer'] },
  { value: 'local', label: 'Local', kinds: ['need'] },
  { value: 'either', label: 'Remote or local', kinds: ['need'] },
]

const DELIVERY_VALUES = new Set<string>(DELIVERY_OPTIONS.map((option) => option.value))

/** The delivery choices that make sense for a kind (all of them for both kinds). */
export function deliveryOptionsFor(kind: MarketplaceKind | null) {
  return kind ? DELIVERY_OPTIONS.filter((option) => option.kinds.includes(kind)) : DELIVERY_OPTIONS
}

export function filtersFromParams(params: URLSearchParams): MarketplaceFilters {
  const kind = params.get('kind')
  return {
    kind: kind === 'offer' || kind === 'need' ? kind : null,
    categoryIds: params.getAll('category').filter(Boolean),
    q: params.get('q') ?? '',
    delivery: params.getAll('delivery').filter((value): value is Delivery => DELIVERY_VALUES.has(value)),
    country: params.get('country') ?? '',
    region: params.get('region') ?? '',
    valueMin: params.get('min') ?? '',
    valueMax: params.get('max') ?? '',
  }
}

export function filtersToParams(filters: MarketplaceFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q.trim()) params.set('q', filters.q.trim())
  if (filters.kind) params.set('kind', filters.kind)
  for (const id of filters.categoryIds) params.append('category', id)
  for (const value of filters.delivery) params.append('delivery', value)
  if (filters.country.trim()) params.set('country', filters.country.trim().toUpperCase())
  if (filters.region.trim()) params.set('region', filters.region.trim())
  if (filters.valueMin.trim()) params.set('min', filters.valueMin.trim())
  if (filters.valueMax.trim()) params.set('max', filters.valueMax.trim())
  return params
}

/** True when anything narrows the search. */
export function hasActiveFilters(filters: MarketplaceFilters): boolean {
  return filtersToParams(filters).toString() !== ''
}

/** Number of location filters set (country, region, delivery), for the button label. */
export function locationFilterCount(filters: MarketplaceFilters): number {
  return (filters.country ? 1 : 0) + (filters.region ? 1 : 0) + filters.delivery.length
}

/** Number of value filters set. */
export function valueFilterCount(filters: MarketplaceFilters): number {
  return (filters.valueMin ? 1 : 0) + (filters.valueMax ? 1 : 0)
}

/** The filter part of the `/marketplace/listings` and `/marketplace/facets` query. */
export interface SearchQuery {
  kind?: MarketplaceKind
  category_id?: string[]
  q?: string
  delivery?: Delivery[]
  country?: string
  region?: string
  value_min_minor?: number
  value_max_minor?: number
}

/**
 * The filters as API query parameters. Values that are not valid (a malformed amount or country
 * typed into the URL by hand) are left out rather than sent.
 */
export function filtersToQuery(filters: MarketplaceFilters): SearchQuery {
  const query: SearchQuery = {}
  if (filters.kind) query.kind = filters.kind
  if (filters.categoryIds.length) query.category_id = filters.categoryIds
  if (filters.q.trim()) query.q = filters.q.trim().slice(0, 200)
  if (filters.delivery.length) query.delivery = filters.delivery
  if (/^[A-Za-z]{2}$/.test(filters.country.trim())) query.country = filters.country.trim().toUpperCase()
  if (filters.region.trim()) query.region = filters.region.trim()
  const min = majorToMinor(filters.valueMin)
  const max = majorToMinor(filters.valueMax)
  if (typeof min === 'number') query.value_min_minor = min
  if (typeof max === 'number') query.value_max_minor = max
  return query
}
