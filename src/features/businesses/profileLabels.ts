import type { components } from '../../lib/api/schema'

type Schemas = components['schemas']

// Copy for the profile's enum fields (bfb-api docs/BUSINESSES.md, "Profile").

export const SERVICE_AREA_LABELS: Record<Schemas['ServiceArea'], string> = {
  local: 'Local',
  regional: 'Regional',
  national: 'National',
  international: 'International',
}

export const BUSINESS_STAGE_LABELS: Record<Schemas['BusinessStage'], string> = {
  idea: 'Idea stage',
  startup: 'Startup',
  growing: 'Growing',
  established: 'Established',
}

export const TEAM_SIZE_LABELS: Record<Schemas['TeamSize'], string> = {
  just_me: 'Just me',
  '2_10': '2–10 people',
  '11_50': '11–50 people',
  '51_200': '51–200 people',
  '201_plus': '201+ people',
}

/** Social link keys the API accepts, in display order. */
export const SOCIAL_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  github: 'GitHub',
  behance: 'Behance',
  dribbble: 'Dribbble',
}

/** Social links in display order, unknown keys last. */
export function orderedSocialLinks(links: Record<string, string> | null | undefined): Array<{ key: string; label: string; url: string }> {
  const order = Object.keys(SOCIAL_LABELS)
  return Object.entries(links ?? {})
    .filter(([, url]) => Boolean(url))
    .sort(([a], [b]) => (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)))
    .map(([key, url]) => ({ key, label: SOCIAL_LABELS[key] ?? key, url }))
}

/** "Detroit, MI, US", skipping parts that are not filled in. Empty when nothing is. */
export function formatLocation(profile: {
  location_city: string | null
  location_region: string | null
  location_country: string | null
}): string {
  return [profile.location_city, profile.location_region, profile.location_country].filter(Boolean).join(', ')
}

/** The website without its scheme or trailing slash, for link text. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '')
}
