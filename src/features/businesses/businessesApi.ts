import type { components } from '../../lib/api/schema'
import { apiPost } from '../../lib/api/requests'

export type CreateBusinessRequest = components['schemas']['BusinessCreateRequest']

/** Create a business. The caller becomes its owner. Fails with `email_not_verified` for unverified users. */
export function createBusiness(body: CreateBusinessRequest) {
  return apiPost('/businesses', body)
}
