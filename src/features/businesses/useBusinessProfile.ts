import { useCallback, useEffect } from 'react'
import { create } from 'zustand'

import { toApiError } from '../../lib/api/errors'
import { businessToSessionBusiness, syncSessionBusiness } from '../../lib/businesses/activeBusiness'
import { useActiveBusinessId } from '../../lib/businesses/useActiveBusiness'
import { useSessionStore } from '../../stores/session'
import { getBusiness, type Business } from './profileApi'

/**
 * The active business's full record (profile, completeness, review status), shared by the
 * pages and the shell so a save on one shows everywhere at once. Keyed by user and business,
 * so a switch or another login never shows the previous one.
 */
type ProfileState = {
  key: string | null
  business: Business | null
  error: unknown
}

export const useBusinessProfileStore = create<ProfileState>(() => ({ key: null, business: null, error: null }))

const inFlight = new Map<string, Promise<void>>()

function storeKey(userId: string | undefined, businessId: string) {
  return `${userId ?? ''}:${businessId}`
}

/** Load (or reload) a business into the shared store. Concurrent calls share one request. */
export function loadBusinessProfile(businessId: string): Promise<void> {
  const key = storeKey(useSessionStore.getState().user?.id, businessId)
  const pending = inFlight.get(key)
  if (pending) return pending

  const request = (async () => {
    try {
      const business = await getBusiness(businessId)
      // Dropped if the user switched business or logged out meanwhile.
      if (storeKey(useSessionStore.getState().user?.id, businessId) !== key) return
      setBusinessProfile(business)
    } catch (error) {
      const state = useBusinessProfileStore.getState()
      // Keep showing what we have if a background refresh fails.
      if (state.key === key && state.business) return
      useBusinessProfileStore.setState({ key, business: null, error: toApiError(error) })
    } finally {
      inFlight.delete(key)
    }
  })()

  inFlight.set(key, request)
  return request
}

/** Put a business the API just returned (from a load, a save or a command) into the store. */
export function setBusinessProfile(business: Business) {
  const key = storeKey(useSessionStore.getState().user?.id, business.id)
  useBusinessProfileStore.setState({ key, business, error: null })
  syncSessionBusiness(businessToSessionBusiness(business))
}

/** For tests and logout: forget the loaded business. */
export function resetBusinessProfile() {
  inFlight.clear()
  useBusinessProfileStore.setState({ key: null, business: null, error: null })
}

// Another user (or none) means another set of businesses: drop the loaded one.
useSessionStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) resetBusinessProfile()
})

interface Options {
  /** Reload when the component mounts even if the business is already loaded (pages do; the shell does not). */
  fresh?: boolean
}

/**
 * The active business's full record. `business` is `null` while it loads for the first time
 * (or when it failed: see `error`). Only under `RequireBusiness`.
 */
export function useBusinessProfile({ fresh = false }: Options = {}) {
  const businessId = useActiveBusinessId()
  const userId = useSessionStore((state) => state.user?.id)
  const key = storeKey(userId, businessId)
  const state = useBusinessProfileStore()
  const current = state.key === key
  const business = current ? state.business : null
  const error = current ? state.error : null
  const needsLoad = !current || (!state.business && !state.error)

  useEffect(() => {
    if (needsLoad) void loadBusinessProfile(businessId)
  }, [needsLoad, businessId])

  useEffect(() => {
    // Refresh on mount (and on a switch): pages show the cached record at once, then the fresh one.
    if (fresh && !needsLoad) void loadBusinessProfile(businessId)
  }, [fresh, businessId])

  const reload = useCallback(() => {
    if (useBusinessProfileStore.getState().key === key) useBusinessProfileStore.setState({ error: null })
    return loadBusinessProfile(businessId)
  }, [businessId, key])

  return { business, error, reload }
}
