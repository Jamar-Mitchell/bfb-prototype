import { z } from 'zod'

import type { ApiError } from '../../lib/api/errors'
import type {
  DeliveryFormat,
  LocationPreference,
  Need,
  NeedCreateRequest,
  NeedUpdateRequest,
  Offer,
  OfferCreateRequest,
  OfferUpdateRequest,
  Urgency,
} from './listingsApi'
import { majorToMinor, minorToMajor } from './money'

/**
 * One form for every listing kind. Fields a kind does not use stay blank and are not sent.
 * Money is typed in major units (dollars) and sent in minor units (cents).
 * Limits from bfb-api docs/LISTINGS.md.
 */
export interface ListingFormValues {
  category_id: string
  title: string
  deliverables: string[]
  value_min: string
  value_max: string
  // Offers
  description: string
  capacity: string
  availability: string
  delivery_format: '' | DeliveryFormat
  location_restrictions: string
  // Needs
  desired_outcome: string
  /** `YYYY-MM-DD` from a date input, or blank. */
  desired_start_date: string
  desired_end_date: string
  location_preference: '' | LocationPreference
  location_notes: string
  urgency: '' | Urgency
}

export const MAX_DELIVERABLES = 20
export const MAX_DELIVERABLE_LENGTH = 200

const tooLong = (max: number) => `Use ${max.toLocaleString('en-US')} characters or fewer.`
const text = (max: number) => z.string().trim().max(max, tooLong(max))
const date = z.string().refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Enter a date.')
const money = z
  .string()
  .refine((value) => majorToMinor(value) !== undefined, 'Enter an amount in dollars, like 1500 or 1500.50.')

export const listingFormSchema = z
  .object({
    category_id: z.string().min(1, 'Choose a category.'),
    title: z.string().trim().min(1, 'Enter a title.').max(120, tooLong(120)),
    deliverables: z
      .array(z.string().trim().min(1, 'A deliverable can’t be blank.').max(MAX_DELIVERABLE_LENGTH, tooLong(MAX_DELIVERABLE_LENGTH)))
      .max(MAX_DELIVERABLES, `Add up to ${MAX_DELIVERABLES} deliverables.`),
    value_min: money,
    value_max: money,
    description: text(5000),
    capacity: z
      .string()
      .trim()
      .refine((value) => value === '' || (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 1000), 'Enter a whole number from 1 to 1,000.'),
    availability: text(500),
    delivery_format: z.enum(['', 'remote', 'in_person', 'hybrid']),
    location_restrictions: text(300),
    desired_outcome: text(5000),
    desired_start_date: date,
    desired_end_date: date,
    location_preference: z.enum(['', 'remote', 'local', 'either']),
    location_notes: text(300),
    urgency: z.enum(['', 'low', 'medium', 'high']),
  })
  .superRefine((values, ctx) => {
    // ISO dates compare correctly as strings.
    if (values.desired_start_date && values.desired_end_date && values.desired_end_date < values.desired_start_date) {
      ctx.addIssue({ code: 'custom', path: ['desired_end_date'], message: 'The end date can’t be before the start date.' })
    }
    const min = majorToMinor(values.value_min)
    const max = majorToMinor(values.value_max)
    if (typeof max !== 'number') return
    if (min === null) ctx.addIssue({ code: 'custom', path: ['value_min'], message: 'Enter a minimum to give a range.' })
    else if (typeof min === 'number' && max < min) ctx.addIssue({ code: 'custom', path: ['value_max'], message: 'The maximum can’t be below the minimum.' })
  })

export const emptyListingForm: ListingFormValues = {
  category_id: '',
  title: '',
  deliverables: [],
  value_min: '',
  value_max: '',
  description: '',
  capacity: '',
  availability: '',
  delivery_format: '',
  location_restrictions: '',
  desired_outcome: '',
  desired_start_date: '',
  desired_end_date: '',
  location_preference: '',
  location_notes: '',
  urgency: '',
}

/** API field names that differ from the form's. */
export const listingFieldMap = {
  value_min_minor: 'value_min',
  value_max_minor: 'value_max',
} as const satisfies Record<string, keyof ListingFormValues>

export const listingFormFields = Object.keys(emptyListingForm) as (keyof ListingFormValues)[]

const blankToNull = (value: string) => (value.trim() === '' ? null : value.trim())

function sharedBody(values: ListingFormValues) {
  return {
    category_id: values.category_id,
    title: values.title.trim(),
    deliverables: values.deliverables,
    value_min_minor: majorToMinor(values.value_min) ?? null,
    value_max_minor: majorToMinor(values.value_max) ?? null,
  }
}

function offerFields(values: ListingFormValues) {
  return {
    description: blankToNull(values.description),
    capacity: values.capacity.trim() === '' ? null : Number(values.capacity),
    availability: blankToNull(values.availability),
    delivery_format: values.delivery_format || null,
    location_restrictions: blankToNull(values.location_restrictions),
  }
}

export function offerCreateBody(values: ListingFormValues): OfferCreateRequest {
  return { ...sharedBody(values), currency: 'USD', ...offerFields(values) }
}

/** Every field is sent: a blank one clears the stored value. The currency is left as it is. */
export function offerUpdateBody(values: ListingFormValues): OfferUpdateRequest {
  return { ...sharedBody(values), ...offerFields(values) }
}

export function offerToForm(offer: Offer): ListingFormValues {
  return {
    ...emptyListingForm,
    category_id: offer.category.id,
    title: offer.title,
    deliverables: offer.deliverables,
    value_min: minorToMajor(offer.value_min_minor),
    value_max: minorToMajor(offer.value_max_minor),
    description: offer.description ?? '',
    capacity: offer.capacity === null ? '' : String(offer.capacity),
    availability: offer.availability ?? '',
    delivery_format: offer.delivery_format ?? '',
    location_restrictions: offer.location_restrictions ?? '',
  }
}

function needFields(values: ListingFormValues) {
  return {
    desired_outcome: blankToNull(values.desired_outcome),
    desired_start_date: values.desired_start_date || null,
    desired_end_date: values.desired_end_date || null,
    location_preference: values.location_preference || null,
    location_notes: blankToNull(values.location_notes),
    urgency: values.urgency || null,
  }
}

export function needCreateBody(values: ListingFormValues): NeedCreateRequest {
  return { ...sharedBody(values), currency: 'USD', ...needFields(values) }
}

/** Every field is sent: a blank one clears the stored value. The currency is left as it is. */
export function needUpdateBody(values: ListingFormValues): NeedUpdateRequest {
  return { ...sharedBody(values), ...needFields(values) }
}

export function needToForm(need: Need): ListingFormValues {
  return {
    ...emptyListingForm,
    category_id: need.category.id,
    title: need.title,
    deliverables: need.deliverables,
    value_min: minorToMajor(need.value_min_minor),
    value_max: minorToMajor(need.value_max_minor),
    desired_outcome: need.desired_outcome ?? '',
    desired_start_date: need.desired_start_date ?? '',
    desired_end_date: need.desired_end_date ?? '',
    location_preference: need.location_preference ?? '',
    location_notes: need.location_notes ?? '',
    urgency: need.urgency ?? '',
  }
}

/** The form field to mark for a `422 invalid_range`: the upper end of the pair the API names. */
export function invalidRangeField(error: ApiError): { field: keyof ListingFormValues; message: string } {
  const fields = (error.details as { fields?: unknown } | undefined)?.fields
  const high = Array.isArray(fields) ? String(fields[fields.length - 1]) : 'value_max_minor'
  const mapped = (listingFieldMap as Record<string, keyof ListingFormValues>)[high] ?? (high as keyof ListingFormValues)
  if (mapped === 'value_max') return { field: 'value_max', message: 'The maximum needs a minimum and can’t be below it.' }
  if (mapped === 'desired_end_date') return { field: 'desired_end_date', message: 'The end date can’t be before the start date.' }
  return { field: listingFormFields.includes(mapped) ? mapped : 'value_max', message: 'This range ends before it starts.' }
}
