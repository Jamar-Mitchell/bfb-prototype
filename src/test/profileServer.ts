import type { Business, Category, ProfileUpdate } from '../features/businesses/profileApi'
import { apiBusiness } from './mockApi'

/** Categories as `GET /categories` returns them (a subset of the API's seed). */
export const apiCategories: Category[] = [
  { id: 'cat-brand', slug: 'branding-design', name: 'Branding & design', description: 'Brand identity and logos.', sort_order: 10, requires_review: false },
  { id: 'cat-marketing', slug: 'marketing-content', name: 'Marketing & content', description: null, sort_order: 20, requires_review: false },
  { id: 'cat-web', slug: 'web-software-development', name: 'Web & software development', description: null, sort_order: 30, requires_review: false },
  { id: 'cat-photo', slug: 'photography-video', name: 'Photography & video', description: null, sort_order: 40, requires_review: false },
  { id: 'cat-strategy', slug: 'business-strategy-operations', name: 'Business strategy & operations', description: null, sort_order: 50, requires_review: false },
  { id: 'cat-books', slug: 'bookkeeping-financial-support', name: 'Bookkeeping & financial support', description: null, sort_order: 60, requires_review: false },
  { id: 'cat-legal', slug: 'legal-compliance-support', name: 'Legal & compliance support', description: null, sort_order: 70, requires_review: true },
]

/** Completeness the way the API computes it (bfb-api docs/BUSINESSES.md, "Completeness"). */
export function withCompleteness(business: Business): Business {
  const filled: Record<string, boolean> = {
    legal_name: Boolean(business.legal_name),
    description: Boolean(business.description),
    industry: Boolean(business.industry),
    business_stage: Boolean(business.business_stage),
    team_size: Boolean(business.team_size),
    location: Boolean(business.location_city && business.location_country),
    service_area: Boolean(business.service_area),
    categories: business.categories.length > 0,
    logo: Boolean(business.logo_upload_id),
  }
  const keys = Object.keys(filled)
  const missing = keys.filter((key) => !filled[key])
  return {
    ...business,
    completeness: { score: Math.round(((keys.length - missing.length) / keys.length) * 100), complete: missing.length === 0, missing },
  }
}

/** A business with its completeness worked out from its fields. */
export function profileBusiness(overrides: Partial<Business> = {}): Business {
  return withCompleteness(apiBusiness(overrides))
}

/** Every required item filled except the logo. */
export const answeredProfile: Partial<Business> = {
  legal_name: 'Northstar Digital LLC',
  business_stage: 'growing',
  categories: [{ id: 'cat-web', slug: 'web-software-development', name: 'Web & software development', requires_review: false }],
  industry: 'Web studio',
  description: 'Websites for growing businesses.',
  team_size: '2_10',
  location_city: 'Atlanta',
  location_region: 'GA',
  location_country: 'US',
  service_area: 'national',
}

/** Apply a `PATCH /profile` body the way the API does (partial; categories by ID). */
export function applyProfileUpdate(business: Business, update: ProfileUpdate): Business {
  const { category_ids, ...fields } = update
  const next = { ...business, ...(fields as Partial<Business>) }
  if (category_ids !== undefined) {
    next.categories = (category_ids ?? []).map((id) => {
      const category = apiCategories.find((item) => item.id === id)
      if (!category) throw new Error(`Unknown category ${id}`)
      return { id: category.id, slug: category.slug, name: category.name, requires_review: category.requires_review }
    })
  }
  if (next.social_links === null) next.social_links = {}
  return withCompleteness(next)
}

/** `GET /businesses/{id}/portfolio` for a business with no work samples yet. */
export const emptyPortfolio = { version: 0, max_items: 24, items: [] }
