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
  business: (id: number) => `/business/${id}`,
} as const

export const businessPathPrefix = '/business/'

/** Same rule as the prototype: anything but `/business/<digits>` falls back to business 1. */
export function getBusinessIdFromPath(pathname: string): number {
  return Number(pathname.match(/^\/business\/(\d+)$/)?.[1] ?? 1)
}
