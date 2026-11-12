import { apiGet, apiPut } from '../../lib/api/requests'
import type { components } from '../../lib/api/schema'

export type Portfolio = components['schemas']['PortfolioResponse']
export type PortfolioItem = components['schemas']['PortfolioItemResponse']
export type PortfolioFile = components['schemas']['PortfolioFile']
export type PortfolioBatch = components['schemas']['PortfolioBatchRequest']
export type PortfolioBatchResult = components['schemas']['PortfolioBatchResponse']
/** What the public profile and the read-only galleries need of an item. */
export type PortfolioEntry = Pick<PortfolioItem, 'id' | 'title' | 'description' | 'link_url' | 'file'>

// Portfolio routes (bfb-api docs/PORTFOLIO.md). File URLs are signed for 15 minutes: refetch, never store them.

/** The portfolio, first item first, with the `version` the next batch must send. Any member. */
export function getPortfolio(businessId: string) {
  return apiGet('/businesses/{business_id}/portfolio', { path: { business_id: businessId } })
}

/**
 * Every change of one editing session (adds, edits, removals and the new order) in one request,
 * applied all together or not at all. Owners and administrators. Fails with
 * `portfolio_version_conflict` when someone else changed the portfolio since `version` was read.
 */
export function savePortfolio(businessId: string, batch: PortfolioBatch) {
  return apiPut('/businesses/{business_id}/portfolio', batch, { path: { business_id: businessId } })
}
