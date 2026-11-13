import { apiDelete, apiGet, apiPut } from '../../lib/api/requests'
import type { components } from '../../lib/api/schema'

export type SavedBusiness = components['schemas']['SavedBusinessResponse']

/**
 * Saved businesses belong to the business, not the user: the whole team shares the list
 * (bfb-api docs/BUSINESSES.md, "Saved businesses"). Any member can save and unsave.
 */

/** Most recently saved first. Businesses that are no longer approved are hidden. Logo URLs expire after 15 minutes. */
export function listSaved(businessId: string): Promise<SavedBusiness[]> {
  return apiGet('/businesses/{business_id}/saved', { path: { business_id: businessId } })
}

/** Idempotent. `404 not_found` when the target is not an approved business. */
export function saveBusiness(businessId: string, targetId: string) {
  return apiPut('/businesses/{business_id}/saved/{target_id}', undefined, { path: { business_id: businessId, target_id: targetId } })
}

/** Idempotent: also succeeds when it was not saved. */
export function unsaveBusiness(businessId: string, targetId: string) {
  return apiDelete('/businesses/{business_id}/saved/{target_id}', { path: { business_id: businessId, target_id: targetId } })
}
