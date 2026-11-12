import type { BusinessStage, ProfileStatus, ServiceArea, TeamSize } from './profileApi'
import { SERVICE_AREA_LABELS, SOCIAL_LABELS, TEAM_SIZE_LABELS } from './profileLabels'

// Options for the profile's enum fields and labels for completeness keys (bfb-api
// docs/BUSINESSES.md). Plain labels live in profileLabels.ts.

/** Onboarding's business-type cards, worded as in the prototype. */
export const BUSINESS_STAGE_OPTIONS: ReadonlyArray<{ value: BusinessStage; label: string; description: string }> = [
  { value: 'idea', label: 'Idea', description: 'Shaping the business before launch' },
  { value: 'startup', label: 'Startup', description: 'Building something new' },
  { value: 'growing', label: 'Growing business', description: 'Scaling an established company' },
  { value: 'established', label: 'Established', description: 'Steady, with a track record' },
]

export const TEAM_SIZE_OPTIONS: ReadonlyArray<{ value: TeamSize; label: string }> = (Object.keys(TEAM_SIZE_LABELS) as TeamSize[]).map(
  (value) => ({ value, label: TEAM_SIZE_LABELS[value] }),
)

export const SERVICE_AREA_OPTIONS: ReadonlyArray<{ value: ServiceArea; label: string; description: string }> = [
  { value: 'local', label: SERVICE_AREA_LABELS.local, description: 'Serving your city and nearby' },
  { value: 'regional', label: SERVICE_AREA_LABELS.regional, description: 'Across your state or region' },
  { value: 'national', label: SERVICE_AREA_LABELS.national, description: 'Anywhere in your country' },
  { value: 'international', label: SERVICE_AREA_LABELS.international, description: 'Clients in other countries too' },
]

export const PROFILE_STATUS_LABELS: Record<ProfileStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  suspended: 'Suspended',
}

/** What each `completeness.missing` key asks for. Unknown (newer) keys fall back to a generic label. */
const COMPLETENESS_LABELS: Record<string, string> = {
  legal_name: 'Legal name',
  description: 'Business description',
  industry: 'Industry',
  business_stage: 'Business stage',
  team_size: 'Team size',
  location: 'City and country',
  service_area: 'Service area',
  categories: 'Service categories',
  logo: 'Logo',
}

export function completenessLabel(key: string): string {
  return COMPLETENESS_LABELS[key] ?? key.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase())
}

export const MAX_CATEGORIES = 5

export const SOCIAL_LINK_KEYS = ['linkedin', 'instagram', 'facebook', 'x', 'tiktok', 'youtube', 'github', 'behance', 'dribbble'] as const
export type SocialLinkKey = (typeof SOCIAL_LINK_KEYS)[number]

export const SOCIAL_LINK_LABELS: Record<SocialLinkKey, string> = SOCIAL_LABELS

// ISO 3166-1 alpha-2 codes; names come from the browser (Intl.DisplayNames).
const COUNTRY_CODES =
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ')

let countryOptions: Array<{ value: string; label: string }> | null = null

/** Every country as a select option, sorted by name. */
export function getCountryOptions(): Array<{ value: string; label: string }> {
  if (!countryOptions) {
    let names: Intl.DisplayNames | null = null
    try {
      names = new Intl.DisplayNames(['en'], { type: 'region' })
    } catch {
      // Very old browsers: show the codes.
    }
    countryOptions = COUNTRY_CODES.map((code) => ({ value: code, label: names?.of(code) ?? code })).sort((a, b) =>
      a.label.localeCompare(b.label),
    )
  }
  return countryOptions
}

export function countryName(code: string | null | undefined): string | null {
  if (!code) return null
  return getCountryOptions().find((option) => option.value === code)?.label ?? code
}

/** Statuses in which the API refuses profile edits (`profile_not_editable`). */
export function isProfileLocked(status: ProfileStatus): boolean {
  return status === 'in_review' || status === 'suspended'
}

/** Owners and administrators edit the profile; members only read it. */
export function canEditProfile(role: 'owner' | 'administrator' | 'member'): boolean {
  return role === 'owner' || role === 'administrator'
}
