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
} as const

export const adminBusinessPattern = '/admin/businesses/:businessId'

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
