import { z } from 'zod'

import type { Business, ProfileUpdate } from '../businesses/profileApi'
import { MAX_CATEGORIES } from '../businesses/profileFields'

/**
 * Onboarding asks for the profile items the API counts towards completeness
 * (bfb-api docs/BUSINESSES.md, "Completeness"), four steps of two items each.
 * The logo is the one required item it does not ask for: uploading is on the profile page.
 */
export const onboardingSchema = z.object({
  display_name: z.string().trim().min(1, 'Enter your business name.').max(100, 'Use 100 characters or fewer.'),
  legal_name: z.string().trim().min(1, 'Enter the registered name of your business.').max(200, 'Use 200 characters or fewer.'),
  business_stage: z.string().min(1, 'Choose the stage that fits best.'),
  category_ids: z
    .array(z.string())
    .min(1, 'Choose at least one category.')
    .max(MAX_CATEGORIES, `Choose up to ${MAX_CATEGORIES} categories.`),
  industry: z.string().trim().min(1, 'Enter your industry.').max(100, 'Use 100 characters or fewer.'),
  description: z.string().trim().min(1, 'Describe your business in a sentence or two.').max(2000, 'Use 2,000 characters or fewer.'),
  team_size: z.string().min(1, 'Choose your team size.'),
  location_city: z.string().trim().min(1, 'Enter your city.').max(100, 'Use 100 characters or fewer.'),
  location_region: z.string().trim().max(100, 'Use 100 characters or fewer.'),
  location_country: z.string().min(1, 'Choose your country.'),
  service_area: z.string().min(1, 'Choose where you work.'),
})

export type OnboardingValues = z.infer<typeof onboardingSchema>
export type OnboardingField = keyof OnboardingValues

interface StepDefinition {
  /** Form fields the step asks for and saves. */
  fields: readonly OnboardingField[]
  /** `completeness.missing` keys it fills. */
  completenessKeys: readonly string[]
}

/** Question steps, numbered 1 to 4 on screen. Step 0 is the welcome and step 5 the summary. */
export const QUESTION_STEPS: readonly StepDefinition[] = [
  { fields: ['display_name', 'legal_name', 'business_stage'], completenessKeys: ['legal_name', 'business_stage'] },
  { fields: ['category_ids', 'industry'], completenessKeys: ['categories', 'industry'] },
  { fields: ['description', 'team_size'], completenessKeys: ['description', 'team_size'] },
  { fields: ['location_city', 'location_region', 'location_country', 'service_area'], completenessKeys: ['location', 'service_area'] },
]

export const WELCOME_STEP = 0
export const SUMMARY_STEP = QUESTION_STEPS.length + 1

/**
 * Where to pick up: the welcome for a business with no answers yet, the first step with a
 * missing item otherwise, and the summary once every step is filled.
 */
export function resumeStep(business: Pick<Business, 'completeness'>): number {
  const missing = new Set(business.completeness.missing)
  const firstIncomplete = QUESTION_STEPS.findIndex((step) => step.completenessKeys.some((key) => missing.has(key)))
  if (firstIncomplete === -1) return SUMMARY_STEP

  const nothingAnswered = QUESTION_STEPS.every((step) => step.completenessKeys.every((key) => missing.has(key)))
  return nothingAnswered ? WELCOME_STEP : firstIncomplete + 1
}

/** Saved answers as form values; unanswered fields are empty. */
export function onboardingValues(business: Business): OnboardingValues {
  return {
    display_name: business.display_name,
    legal_name: business.legal_name ?? '',
    business_stage: business.business_stage ?? '',
    category_ids: business.categories.map((category) => category.id),
    industry: business.industry ?? '',
    description: business.description ?? '',
    team_size: business.team_size ?? '',
    location_city: business.location_city ?? '',
    location_region: business.location_region ?? '',
    location_country: business.location_country ?? '',
    service_area: business.service_area ?? '',
  }
}

/** The PATCH body for one question step (1 to 4): only that step's fields. */
export function stepUpdate(step: number, values: OnboardingValues): ProfileUpdate {
  switch (step) {
    case 1:
      return {
        display_name: values.display_name,
        legal_name: values.legal_name,
        business_stage: values.business_stage as ProfileUpdate['business_stage'],
      }
    case 2:
      return { category_ids: values.category_ids, industry: values.industry }
    case 3:
      return { description: values.description, team_size: values.team_size as ProfileUpdate['team_size'] }
    case 4:
      return {
        location_city: values.location_city,
        location_region: values.location_region || null,
        location_country: values.location_country,
        service_area: values.service_area as ProfileUpdate['service_area'],
      }
    default:
      return {}
  }
}
