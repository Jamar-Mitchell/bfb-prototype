import { apiGet } from '../../lib/api/requests'
import type { components } from '../../lib/api/schema'

export type PublicBusiness = components['schemas']['PublicBusinessResponse']

/**
 * The public profile of an approved business (bfb-api docs/BUSINESSES.md). No login needed.
 * Anything not approved, and unknown IDs, fail with `404 not_found`. Image URLs are signed for
 * 15 minutes: refetch rather than keep them.
 */
export function getPublicBusiness(businessId: string) {
  return apiGet('/public/businesses/{target_id}', { path: { target_id: businessId } })
}
