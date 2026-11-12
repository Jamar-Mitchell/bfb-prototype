import { BriefcaseBusiness, type LucideIcon } from 'lucide-react'

import { offerCreateBody, offerToForm, offerUpdateBody, type ListingFormValues } from './listingForm'
import {
  createOffer,
  listOffers,
  runOfferCommand,
  updateOffer,
  type Listing,
  type ListingCommand,
  type Offer,
} from './listingsApi'

export type ListingKindId = 'offer'

/**
 * Everything that differs between offers and needs: copy, the API routes and how the shared
 * form maps to the kind's fields. The page, cards and form are written once against this.
 */
export interface ListingKind {
  id: ListingKindId
  /** Lowercase singular, e.g. "offer". */
  noun: string
  /** Capitalised singular, e.g. "Offer". */
  title: string
  plural: string
  /** "Add an offer" */
  addLabel: string
  sectionTitle: string
  sectionDescription: string
  /** Under the active count in the page summary. */
  summaryLine: string
  /** Label before the value on a card, e.g. "Estimated exchange value". */
  valueLabel: string
  /** Label for the min and max money fields in the form. */
  valueFieldLabel: string
  icon: LucideIcon
  /** The longer text a card shows under the title. */
  summaryOf: (listing: Listing) => string | null
  /** `missing_for_publish` keys → phrases for "To publish, add …". */
  missingPhrases: Record<string, string>
  list: (businessId: string) => Promise<Listing[]>
  create: (businessId: string, values: ListingFormValues) => Promise<Listing>
  update: (businessId: string, listingId: string, values: ListingFormValues) => Promise<Listing>
  command: (businessId: string, listingId: string, command: ListingCommand) => Promise<Listing>
  toForm: (listing: Listing) => ListingFormValues
}

export const offerKind: ListingKind = {
  id: 'offer',
  noun: 'offer',
  title: 'Offer',
  plural: 'offers',
  addLabel: 'Add an offer',
  sectionTitle: 'What we offer',
  sectionDescription: 'Services available to exchange.',
  summaryLine: 'Services your business can provide',
  valueLabel: 'Estimated exchange value',
  valueFieldLabel: 'Estimated value',
  icon: BriefcaseBusiness,
  summaryOf: (listing) => (listing as Offer).description,
  missingPhrases: {
    description: 'a description',
    deliverables: 'at least one deliverable',
    estimated_value: 'an estimated value',
    delivery_format: 'a delivery format',
  },
  list: listOffers,
  create: (businessId, values) => createOffer(businessId, offerCreateBody(values)),
  update: (businessId, listingId, values) => updateOffer(businessId, listingId, offerUpdateBody(values)),
  command: runOfferCommand,
  toForm: (listing) => offerToForm(listing as Offer),
}

/** The kinds wired to the API, in page order. */
export const listingKinds: ListingKind[] = [offerKind]
