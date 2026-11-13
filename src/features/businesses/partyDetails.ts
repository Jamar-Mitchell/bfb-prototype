import { z } from 'zod'

import type { components } from '../../lib/api/schema'
import type { Business, ProfileUpdate } from './profileApi'

// Party details (bfb-api docs/BUSINESSES.md, "Party details"): the legal name, entity type and
// registered address that name a business in its Business Exchange Agreements. Private, and
// needed before a business can send or accept a proposal.

export type EntityType = components['schemas']['EntityType']

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  sole_proprietorship: 'Sole proprietorship',
  llc: 'Limited liability company (LLC)',
  corporation: 'Corporation',
  partnership: 'Partnership',
  nonprofit: 'Nonprofit',
  other: 'Other',
}

export const ENTITY_TYPE_OPTIONS = (Object.keys(ENTITY_TYPE_LABELS) as EntityType[]).map((value) => ({ value, label: ENTITY_TYPE_LABELS[value] }))

const MISSING_LABELS: Record<string, string> = {
  legal_name: 'legal name',
  entity_type: 'entity type',
  'registered_address.line1': 'street address',
  'registered_address.city': 'city',
  'registered_address.postal_code': 'postal code',
  'registered_address.country': 'country',
}

/** The API's `party_details_missing` keys in words: "legal name, entity type and city". */
export function describePartyDetailsMissing(missing: readonly string[]): string {
  const words = missing.map((key) => MISSING_LABELS[key] ?? key.replace(/^registered_address\./, '').replace(/_/g, ' '))
  if (words.length <= 1) return words[0] ?? ''
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

/** `details.missing` of a `party_details_missing` error, or every key when the API gave none. */
export function partyDetailsMissingFrom(details: unknown): string[] {
  const missing = (details as { missing?: unknown } | null | undefined)?.missing
  return Array.isArray(missing) ? missing.filter((key): key is string => typeof key === 'string') : Object.keys(MISSING_LABELS)
}

const max = (length: number) => z.string().trim().max(length, `Use ${length.toLocaleString('en-US')} characters or fewer.`)

export const partyDetailsSchema = z.object({
  legal_name: max(200),
  entity_type: z.string(),
  line1: max(200),
  line2: max(200),
  city: max(100),
  region: max(100),
  postal_code: max(20),
  country: z.string(),
})

export type PartyDetailsValues = z.infer<typeof partyDetailsSchema>

export function partyDetailsValues(business: Business): PartyDetailsValues {
  const address = business.registered_address ?? {}
  return {
    legal_name: business.legal_name ?? '',
    entity_type: business.entity_type ?? '',
    line1: address.line1 ?? '',
    line2: address.line2 ?? '',
    city: address.city ?? '',
    region: address.region ?? '',
    postal_code: address.postal_code ?? '',
    country: address.country ?? '',
  }
}

const ADDRESS_FIELDS = ['line1', 'line2', 'city', 'region', 'postal_code', 'country'] as const

const blankToNull = (value: string) => value.trim() || null

/**
 * The PATCH body for what changed. The address is sent whole (the API replaces it), or `null`
 * when every line is blank.
 */
export function partyDetailsUpdate(values: PartyDetailsValues, changed: ReadonlyArray<keyof PartyDetailsValues>): ProfileUpdate {
  const body: ProfileUpdate = {}
  if (changed.includes('legal_name')) body.legal_name = blankToNull(values.legal_name)
  if (changed.includes('entity_type')) body.entity_type = (values.entity_type || null) as EntityType | null
  if (ADDRESS_FIELDS.some((field) => changed.includes(field))) {
    const address = Object.fromEntries(ADDRESS_FIELDS.map((field) => [field, blankToNull(values[field])]))
    body.registered_address = Object.values(address).some(Boolean) ? address : null
  }
  return body
}
