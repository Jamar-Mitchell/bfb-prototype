import { useCallback, useEffect, useState } from 'react'

import { updateBusinessRole } from '../../lib/businesses/activeBusiness'
import { getBusiness, listCategories, type Category } from './listingsApi'
import type { KnownProfileStatus } from './listingRules'

/**
 * The business's review status, which decides whether listings can go live. Also keeps the
 * caller's role in step with the API, as the team page does.
 */
export function useProfileStatus(businessId: string) {
  const [profileStatus, setProfileStatus] = useState<KnownProfileStatus>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let live = true
    getBusiness(businessId)
      .then((business) => {
        if (!live) return
        setProfileStatus(business.profile_status)
        updateBusinessRole(businessId, business.role)
      })
      .catch(() => {
        if (live) setProfileStatus((current) => (current === null ? 'unknown' : current))
      })
    return () => {
      live = false
    }
  }, [businessId, reloadKey])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])
  return { profileStatus, reload }
}

/** Active categories for the listing form. `error` is set if they could not be loaded; `retry` tries again. */
export function useCategories() {
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let live = true
    setError(null)
    listCategories()
      .then((result) => {
        if (live) setCategories(result)
      })
      .catch((reason: unknown) => {
        if (live) setError(reason)
      })
    return () => {
      live = false
    }
  }, [reloadKey])

  const retry = useCallback(() => setReloadKey((key) => key + 1), [])
  return { categories, error, retry }
}
