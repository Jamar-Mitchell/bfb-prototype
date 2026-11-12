import { z } from 'zod'

import type { Business, ProfileUpdate } from './profileApi'
import { MAX_CATEGORIES, SOCIAL_LINK_KEYS, type SocialLinkKey } from './profileFields'

// Rules from bfb-api docs/BUSINESSES.md (`PATCH /profile`). Optional fields may be blank.

const max = (length: number) => z.string().trim().max(length, `Use ${length.toLocaleString('en-US')} characters or fewer.`)

/** Adds `https://` when the scheme is left out, as people often type `example.com`. */
export function normalizeUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function isWebUrl(value: string): boolean {
  if (!value.trim()) return true
  try {
    const url = new URL(normalizeUrl(value))
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.')
  } catch {
    return false
  }
}

const webUrl = max(300).refine(isWebUrl, 'Enter a web address, for example https://example.com.')

const socialLinksSchema = z.object(
  Object.fromEntries(SOCIAL_LINK_KEYS.map((key) => [key, webUrl])) as Record<SocialLinkKey, typeof webUrl>,
)

export const profileSchema = z.object({
  display_name: z.string().trim().min(1, 'Enter your business name.').max(100, 'Use 100 characters or fewer.'),
  legal_name: max(200),
  description: max(2000),
  industry: max(100),
  website_url: webUrl,
  business_stage: z.string(),
  team_size: z.string(),
  service_area: z.string(),
  location_city: max(100),
  location_region: max(100),
  location_country: z.string(),
  category_ids: z.array(z.string()).max(MAX_CATEGORIES, `Choose up to ${MAX_CATEGORIES} categories.`),
  social_links: socialLinksSchema,
})

export type ProfileValues = z.infer<typeof profileSchema>

export function profileValues(business: Business): ProfileValues {
  const social = business.social_links ?? {}
  return {
    display_name: business.display_name,
    legal_name: business.legal_name ?? '',
    description: business.description ?? '',
    industry: business.industry ?? '',
    website_url: business.website_url ?? '',
    business_stage: business.business_stage ?? '',
    team_size: business.team_size ?? '',
    service_area: business.service_area ?? '',
    location_city: business.location_city ?? '',
    location_region: business.location_region ?? '',
    location_country: business.location_country ?? '',
    category_ids: business.categories.map((category) => category.id),
    social_links: Object.fromEntries(SOCIAL_LINK_KEYS.map((key) => [key, social[key] ?? ''])) as Record<SocialLinkKey, string>,
  }
}

const blankToNull = (value: string) => value.trim() || null

/**
 * The PATCH body for the fields the user changed (`changed` lists them). Blank optional
 * fields are sent as `null` to clear them; social links are sent as a whole set.
 */
export function profileUpdate(values: ProfileValues, changed: ReadonlyArray<keyof ProfileValues>): ProfileUpdate {
  const body: ProfileUpdate = {}
  for (const field of changed) {
    switch (field) {
      case 'display_name':
        body.display_name = values.display_name.trim()
        break
      case 'website_url':
        body.website_url = blankToNull(normalizeUrl(values.website_url))
        break
      case 'business_stage':
        body.business_stage = (values.business_stage || null) as ProfileUpdate['business_stage']
        break
      case 'team_size':
        body.team_size = (values.team_size || null) as ProfileUpdate['team_size']
        break
      case 'service_area':
        body.service_area = (values.service_area || null) as ProfileUpdate['service_area']
        break
      case 'location_country':
        body.location_country = values.location_country || null
        break
      case 'category_ids':
        body.category_ids = values.category_ids
        break
      case 'social_links': {
        const links = Object.entries(values.social_links)
          .map(([key, value]) => [key, normalizeUrl(value)] as const)
          .filter(([, value]) => value)
        body.social_links = links.length ? Object.fromEntries(links) : null
        break
      }
      default:
        body[field] = blankToNull(values[field])
    }
  }
  return body
}
