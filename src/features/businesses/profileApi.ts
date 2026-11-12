import { apiGet, apiPatch } from '../../lib/api/requests'
import type { components } from '../../lib/api/schema'

export type Business = components['schemas']['BusinessResponse']
export type ProfileUpdate = components['schemas']['BusinessProfileUpdateRequest']
export type Category = components['schemas']['CategoryResponse']
export type ProfileStatus = components['schemas']['ProfileStatus']
export type BusinessStage = components['schemas']['BusinessStage']
export type TeamSize = components['schemas']['TeamSize']
export type ServiceArea = components['schemas']['ServiceArea']

// Profile routes (bfb-api docs/BUSINESSES.md).

/** The business with its profile, completeness and review status. Any member. */
export function getBusiness(businessId: string) {
  return apiGet('/businesses/{business_id}', { path: { business_id: businessId } })
}

/**
 * Partial profile update: fields left out are kept, `null` clears. Owners and administrators.
 * Fails with `profile_not_editable` while the profile is in review or suspended.
 */
export function updateProfile(businessId: string, body: ProfileUpdate) {
  return apiPatch('/businesses/{business_id}/profile', body, { path: { business_id: businessId } })
}

let categories: Promise<Category[]> | null = null

/** Active service categories in display order. Public, and the same for everyone: loaded once per page load. */
export function listCategories(): Promise<Category[]> {
  if (!categories) {
    categories = apiGet('/categories')
    categories.catch(() => {
      categories = null
    })
  }
  return categories
}

/** For tests: forget the loaded categories. */
export function resetCategoriesCache() {
  categories = null
}
