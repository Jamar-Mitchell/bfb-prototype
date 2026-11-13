import { apiGet } from '../../lib/api/requests'
import type { components } from '../../lib/api/schema'
import type { SearchQuery } from './marketplaceFilters'

type Schemas = components['schemas']

export type MarketplaceListing = Schemas['MarketplaceOffer'] | Schemas['MarketplaceNeed']
export type MarketplacePage = Schemas['MarketplacePageResponse']
export type CategoryFacet = Schemas['CategoryFacet']
export type BusinessSummary = Schemas['BusinessSummary']

export const PAGE_SIZE = 20

/**
 * Repeatable parameters go as `category_id=a&category_id=b`, which is what the API reads
 * (axios would otherwise send `category_id[]=a`).
 */
const repeatParams = { paramsSerializer: { indexes: null } } as const

/**
 * One page of active offers and needs from approved businesses (bfb-api docs/MARKETPLACE.md).
 * Newest first, or most relevant first with `q`. Send `next_cursor` back with the same filters.
 * `logo_url` is signed for 15 minutes: never keep it.
 */
export function searchListings(
  filters: SearchQuery,
  options: { viewerBusinessId: string; cursor?: string | null },
): Promise<MarketplacePage> {
  return apiGet('/marketplace/listings', {
    ...repeatParams,
    query: {
      ...filters,
      exclude_business_id: options.viewerBusinessId,
      // Fills each item's `saved` flag for the viewer's business.
      business_id: options.viewerBusinessId,
      limit: PAGE_SIZE,
      cursor: options.cursor ?? undefined,
    },
  })
}

/** Listing counts per category for the same filters, ignoring the category filter. */
export function searchFacets(filters: SearchQuery, options: { viewerBusinessId: string }) {
  const { category_id: _ignored, ...rest } = filters
  return apiGet('/marketplace/facets', {
    ...repeatParams,
    query: { ...rest, exclude_business_id: options.viewerBusinessId },
  })
}
