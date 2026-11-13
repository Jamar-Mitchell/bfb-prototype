import { apiGet } from '../../lib/api/requests'
import type { components } from '../../lib/api/schema'

type Schemas = components['schemas']

// Exchanges (bfb-api docs/EXCHANGES.md). An exchange exists once both businesses signed its
// agreement, with the milestones each business delivers copied from the accepted terms.
// Read-only until delivery (Phase 6): `active` is the only status and every milestone is
// `pending`. Any member of either business can read one; anyone else gets `404 not_found`.

export type ExchangeSummary = Schemas['ExchangeListItem']
export type Exchange = Schemas['ExchangeResponse']
export type ExchangeMilestone = Schemas['ExchangeMilestoneResponse']
export type ExchangeStatus = Schemas['ExchangeStatus']

export const EXCHANGES_PAGE_SIZE = 20

/** The business's active exchanges, newest first. */
export function listActiveExchanges(businessId: string, { limit = EXCHANGES_PAGE_SIZE, cursor }: { limit?: number; cursor?: string | null } = {}) {
  return apiGet('/businesses/{business_id}/exchanges', {
    path: { business_id: businessId },
    query: { status: 'active', limit, ...(cursor ? { cursor } : {}) },
  })
}

/** One exchange with its milestones, in order. */
export function getExchange(businessId: string, exchangeId: string): Promise<Exchange> {
  return apiGet('/businesses/{business_id}/exchanges/{exchange_id}', { path: { business_id: businessId, exchange_id: exchangeId } })
}
