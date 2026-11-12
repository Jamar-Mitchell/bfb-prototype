import { useSessionStore, type SessionBusiness } from '../../stores/session'
import { toApiError } from '../api/errors'
import { apiGet } from '../api/requests'
import type { components } from '../api/schema'

export type ApiMembership = components['schemas']['MembershipResponse']
export type ApiBusiness = components['schemas']['BusinessResponse']

/**
 * The business the user last switched to, so a reload or a new tab opens the same one.
 * The API keeps no current business (bfb-api docs/BUSINESSES.md). Other tabs do not
 * follow a switch: each tab keeps the business it is showing until it reloads.
 */
export const ACTIVE_BUSINESS_KEY = 'bfb.activeBusinessId'

export function readStoredActiveBusinessId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_BUSINESS_KEY)
  } catch {
    return null
  }
}

function storeActiveBusinessId(id: string) {
  try {
    localStorage.setItem(ACTIVE_BUSINESS_KEY, id)
  } catch {
    // Storage unavailable: the choice lasts for this page only.
  }
}

export function membershipToSessionBusiness(membership: ApiMembership): SessionBusiness {
  return { id: membership.business_id, name: membership.business_name, role: membership.role }
}

export function businessToSessionBusiness(business: ApiBusiness): SessionBusiness {
  return { id: business.id, name: business.display_name, role: business.role }
}

/** The preferred business if the user still belongs to it, otherwise their first (oldest) one. */
export function pickActiveBusiness(memberships: SessionBusiness[], preferredId: string | null): SessionBusiness | null {
  return memberships.find((business) => business.id === preferredId) ?? memberships[0] ?? null
}

/** Store the user's memberships and choose the active business from them. */
export function applyMemberships(memberships: SessionBusiness[]) {
  const session = useSessionStore.getState()
  const preferredId = session.activeBusiness?.id ?? readStoredActiveBusinessId()
  const active = pickActiveBusiness(memberships, preferredId)

  if (active) storeActiveBusinessId(active.id)
  session.setMemberships(memberships, active)
}

/** Make one of the user's businesses active. Pages under the shell reload for it. */
export function switchBusiness(businessId: string) {
  const session = useSessionStore.getState()
  const business = session.memberships?.find((item) => item.id === businessId)
  if (!business || business.id === session.activeBusiness?.id) return

  storeActiveBusinessId(business.id)
  session.setActiveBusiness(business)
}

/** A business the user just created: add it to their memberships and make it active. */
export function addBusiness(business: SessionBusiness) {
  const session = useSessionStore.getState()
  const memberships = [...(session.memberships ?? []).filter((item) => item.id !== business.id), business]

  storeActiveBusinessId(business.id)
  session.setMemberships(memberships, business)
}

/**
 * A business the user no longer belongs to (they left it): drop it from their memberships.
 * If it was active, the next one becomes active; with none left, business pages send the
 * user to the create-business step. Returns the new active business.
 */
export function removeBusiness(businessId: string): SessionBusiness | null {
  const session = useSessionStore.getState()
  const memberships = (session.memberships ?? []).filter((item) => item.id !== businessId)
  const active = session.activeBusiness?.id === businessId ? (memberships[0] ?? null) : session.activeBusiness

  if (active) storeActiveBusinessId(active.id)
  session.setMemberships(memberships, active)
  return active
}

/** The user's role in one of their businesses changed, e.g. they handed over ownership. */
export function updateBusinessRole(businessId: string, role: SessionBusiness['role']) {
  const session = useSessionStore.getState()
  if (session.activeBusiness?.id === businessId && session.activeBusiness.role === role) return

  const update = (business: SessionBusiness) => (business.id === businessId ? { ...business, role } : business)
  const active = session.activeBusiness ? update(session.activeBusiness) : null
  if (session.memberships) session.setMemberships(session.memberships.map(update), active)
  else session.setActiveBusiness(active)
}

let loading: Promise<void> | null = null

/**
 * Load the user's memberships from `GET /account`. Callers share one request.
 * A result that arrives after the user logged out (or changed) is dropped.
 */
export function loadMemberships(): Promise<void> {
  if (loading) return loading

  const userId = useSessionStore.getState().user?.id
  useSessionStore.getState().setMembershipsError(null)

  loading = (async () => {
    try {
      const account = await apiGet('/account')
      if (stillSameSession(userId)) applyMemberships(account.memberships.map(membershipToSessionBusiness))
    } catch (error) {
      if (stillSameSession(userId)) useSessionStore.getState().setMembershipsError(toApiError(error))
    } finally {
      loading = null
    }
  })()

  return loading
}

function stillSameSession(userId: string | undefined) {
  const session = useSessionStore.getState()
  return session.status === 'authenticated' && session.user?.id === userId
}

/**
 * Path of a business-scoped API route, for example `businessPath(id, '/offers')` →
 * `/businesses/<id>/offers`. With the typed helpers, pass the ID as a path parameter instead:
 * `apiGet('/businesses/{business_id}', { path: { business_id: id } })`.
 */
export function businessPath(businessId: string, subpath = ''): string {
  return `/businesses/${encodeURIComponent(businessId)}${subpath}`
}
