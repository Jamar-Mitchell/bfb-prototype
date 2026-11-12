import { apiGet, apiPatch, apiPost } from '../../lib/api/requests'
import type { components } from '../../lib/api/schema'

// Offers and needs routes (bfb-api docs/LISTINGS.md). Members read; owners and administrators write.

export type Offer = components['schemas']['OfferResponse']
export type OfferCreateRequest = components['schemas']['OfferCreateRequest']
export type OfferUpdateRequest = components['schemas']['OfferUpdateRequest']
export type DeliveryFormat = components['schemas']['DeliveryFormat']
export type Need = components['schemas']['NeedResponse']
export type NeedCreateRequest = components['schemas']['NeedCreateRequest']
export type NeedUpdateRequest = components['schemas']['NeedUpdateRequest']
export type LocationPreference = components['schemas']['LocationPreference']
export type Urgency = components['schemas']['Urgency']
export type ListingStatus = components['schemas']['ListingStatus']
export type Category = components['schemas']['CategoryResponse']
export type ProfileStatus = components['schemas']['ProfileStatus']
export type Business = components['schemas']['BusinessResponse']

/** An offer or a need. The shared fields (title, category, status, value…) are the same on both. */
export type Listing = Offer | Need

/** The lifecycle commands: `POST .../{id}/<command>`, no body. */
export type ListingCommand = 'publish' | 'pause' | 'resume' | 'archive'

/** Active categories in display order, for the category select. Public. */
export function listCategories() {
  return apiGet('/categories')
}

/** The business as its member sees it, for `profile_status` and the caller's role. */
export function getBusiness(businessId: string) {
  return apiGet('/businesses/{business_id}', { path: { business_id: businessId } })
}

/** Every offer of the business, newest first. Filtering by status happens on the page so it can show counts. */
export function listOffers(businessId: string) {
  return apiGet('/businesses/{business_id}/offers', { path: { business_id: businessId } })
}

/** A new offer is always a draft. */
export function createOffer(businessId: string, body: OfferCreateRequest) {
  return apiPost('/businesses/{business_id}/offers', body, { path: { business_id: businessId } })
}

/** Leave a field out to keep it, `null` to clear it. Archived offers refuse edits. */
export function updateOffer(businessId: string, offerId: string, body: OfferUpdateRequest) {
  return apiPatch('/businesses/{business_id}/offers/{offer_id}', body, { path: { business_id: businessId, offer_id: offerId } })
}

export function runOfferCommand(businessId: string, offerId: string, command: ListingCommand): Promise<Offer> {
  const options = { path: { business_id: businessId, offer_id: offerId } }
  switch (command) {
    case 'publish':
      return apiPost('/businesses/{business_id}/offers/{offer_id}/publish', undefined, options)
    case 'pause':
      return apiPost('/businesses/{business_id}/offers/{offer_id}/pause', undefined, options)
    case 'resume':
      return apiPost('/businesses/{business_id}/offers/{offer_id}/resume', undefined, options)
    case 'archive':
      return apiPost('/businesses/{business_id}/offers/{offer_id}/archive', undefined, options)
  }
}

/** Every need of the business, newest first. */
export function listNeeds(businessId: string) {
  return apiGet('/businesses/{business_id}/needs', { path: { business_id: businessId } })
}

/** A new need is always a draft. */
export function createNeed(businessId: string, body: NeedCreateRequest) {
  return apiPost('/businesses/{business_id}/needs', body, { path: { business_id: businessId } })
}

/** Leave a field out to keep it, `null` to clear it. Archived needs refuse edits. */
export function updateNeed(businessId: string, needId: string, body: NeedUpdateRequest) {
  return apiPatch('/businesses/{business_id}/needs/{need_id}', body, { path: { business_id: businessId, need_id: needId } })
}

export function runNeedCommand(businessId: string, needId: string, command: ListingCommand): Promise<Need> {
  const options = { path: { business_id: businessId, need_id: needId } }
  switch (command) {
    case 'publish':
      return apiPost('/businesses/{business_id}/needs/{need_id}/publish', undefined, options)
    case 'pause':
      return apiPost('/businesses/{business_id}/needs/{need_id}/pause', undefined, options)
    case 'resume':
      return apiPost('/businesses/{business_id}/needs/{need_id}/resume', undefined, options)
    case 'archive':
      return apiPost('/businesses/{business_id}/needs/{need_id}/archive', undefined, options)
  }
}
