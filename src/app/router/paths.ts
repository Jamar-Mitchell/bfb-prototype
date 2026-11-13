export const paths = {
  landing: '/',
  onboarding: '/onboarding',
  login: '/login',
  register: '/register',
  verifyEmail: '/verify-email',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  createBusiness: '/create-business',
  acceptInvite: '/accept-invite',
  dashboard: '/dashboard',
  marketplace: '/marketplace',
  saved: '/saved',
  /** The active business's matches, and one match with why it was made. */
  matches: '/matches',
  match: (id: string) => `/matches/${id}`,
  /** The active business's proposals, and one proposal. */
  proposals: '/proposals',
  proposal: (id: string) => `/proposals/${id}`,
  /** The proposal builder: this business's draft. */
  proposalEdit: (id: string) => `/proposals/${id}/edit`,
  exchanges: '/exchanges',
  messages: '/messages',
  profile: '/profile',
  listings: '/listings',
  team: '/team',
  /** Prototype profile of a demo business (marketplace data until Phase 3). */
  business: (id: number) => `/business/${id}`,
  /** Public profile of a real, approved business. Works logged out, so it sits outside the app shell. */
  publicBusiness: (id: string) => `/b/${id}`,
  /** Admin review queue (support and administrator users only). */
  admin: '/admin',
  adminBusiness: (id: string) => `/admin/businesses/${id}`,
  /** Admin match workspace: the list of concierge matches, creating one, and a match's detail. */
  adminMatches: '/admin/matches',
  adminNewMatch: '/admin/matches/new',
  adminMatch: (id: string) => `/admin/matches/${id}`,
} as const

export const adminBusinessPattern = '/admin/businesses/:businessId'

export const adminMatchPattern = '/admin/matches/:matchId'

export const matchPattern = '/matches/:matchId'

export const proposalPattern = '/proposals/:proposalId'

export const proposalEditPattern = '/proposals/:proposalId/edit'

export const publicBusinessPattern = '/b/:businessId'

export const businessPathPrefix = '/business/'

/** Same rule as the prototype: anything but `/business/<digits>` falls back to business 1. */
export function getBusinessIdFromPath(pathname: string): number {
  return Number(pathname.match(/^\/business\/(\d+)$/)?.[1] ?? 1)
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Real business IDs are UUIDs; demo businesses have small numeric IDs. */
export function isBusinessUuid(value: string | undefined): value is string {
  return value !== undefined && UUID.test(value)
}
