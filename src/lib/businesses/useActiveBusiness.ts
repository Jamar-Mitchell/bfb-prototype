import { useCallback, useEffect } from 'react'

import { useSessionStore, type SessionBusiness } from '../../stores/session'
import { businessPath, loadMemberships } from './activeBusiness'

/** The user's memberships, loading them once the session is known. */
export function useMemberships() {
  const status = useSessionStore((state) => state.status)
  const memberships = useSessionStore((state) => state.memberships)
  const error = useSessionStore((state) => state.membershipsError)
  const shouldLoad = status === 'authenticated' && memberships === null && !error

  useEffect(() => {
    if (shouldLoad) void loadMemberships()
  }, [shouldLoad])

  return { memberships, error, retry: loadMemberships }
}

/**
 * The active business. Only for components under `RequireBusiness`, which guarantees one;
 * anywhere else it throws.
 */
export function useActiveBusiness(): SessionBusiness {
  const business = useSessionStore((state) => state.activeBusiness)
  if (!business) throw new Error('useActiveBusiness needs an active business (render under RequireBusiness)')
  return business
}

/** ID of the active business, for business-scoped requests. Use it in effect dependencies so data reloads on a switch. */
export function useActiveBusinessId(): string {
  return useActiveBusiness().id
}

/** Builds `/businesses/<active id>/...` paths for the active business. */
export function useBusinessPath(): (subpath?: string) => string {
  const id = useActiveBusinessId()
  return useCallback((subpath?: string) => businessPath(id, subpath), [id])
}
