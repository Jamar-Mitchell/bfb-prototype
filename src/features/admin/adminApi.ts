import { apiGet, apiPost } from '../../lib/api/requests'
import type { components } from '../../lib/api/schema'

export type ReviewQueue = components['schemas']['ReviewQueueResponse']
export type ReviewQueueItem = components['schemas']['ReviewQueueItem']
export type AdminBusiness = components['schemas']['AdminBusinessResponse']
export type Review = components['schemas']['ReviewResponse']
export type ProfileStatus = components['schemas']['ProfileStatus']

// Admin review routes (bfb-api docs/ADMIN.md). Support and administrator users only;
// anyone else gets 403 forbidden.

export const QUEUE_PAGE_SIZE = 20

/** Businesses in review, oldest submission first. */
export function listReviewQueue({ offset = 0, limit = QUEUE_PAGE_SIZE }: { offset?: number; limit?: number } = {}) {
  return apiGet('/admin/reviews', { query: { status: 'in_review', limit, offset } })
}

/** Everything a reviewer needs: full profile, members, listing counts and every decision (newest first). */
export function getAdminBusiness(businessId: string) {
  return apiGet('/admin/businesses/{business_id}', { path: { business_id: businessId } })
}

/** Only from `in_review`; otherwise `409 invalid_profile_status`. Notes are optional and shown to the business. */
export function approveBusiness(businessId: string, notes?: string) {
  return apiPost('/admin/businesses/{business_id}/approve', notes ? { notes } : {}, { path: { business_id: businessId } })
}

/** Only from `in_review`. Notes are required (1 to 2,000 characters) and shown to the business. */
export function requestBusinessChanges(businessId: string, notes: string) {
  return apiPost('/admin/businesses/{business_id}/request-changes', { notes }, { path: { business_id: businessId } })
}
