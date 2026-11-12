import { useCallback, useEffect, useRef, useState } from 'react'

import { toApiError } from '../../lib/api/errors'
import type { ListingKind, ListingKindId } from './listingKinds'
import type { Listing } from './listingsApi'

export interface KindListings {
  /** `null` until loaded. */
  listings: Listing[] | null
  error: unknown
}

type ListingsByKind = Partial<Record<ListingKindId, KindListings>>

/**
 * Every kind's listings for the business, kept current as commands and edits come back.
 * The page remounts on a business switch (the shell keys it), so one business per mount.
 */
export function useListings(kinds: readonly ListingKind[], businessId: string) {
  const [byKind, setByKind] = useState<ListingsByKind>({})
  const mounted = useRef(true)

  const load = useCallback(
    async (kind: ListingKind) => {
      setByKind((current) => ({ ...current, [kind.id]: { listings: current[kind.id]?.listings ?? null, error: null } }))
      try {
        const listings = await kind.list(businessId)
        if (mounted.current) setByKind((current) => ({ ...current, [kind.id]: { listings, error: null } }))
      } catch (error) {
        const apiError = toApiError(error)
        if (mounted.current) {
          setByKind((current) => ({ ...current, [kind.id]: { listings: current[kind.id]?.listings ?? null, error: apiError } }))
        }
      }
    },
    [businessId],
  )

  useEffect(() => {
    mounted.current = true
    for (const kind of kinds) void load(kind)
    return () => {
      mounted.current = false
    }
  }, [kinds, load])

  /** Put a listing the API returned into its list: replace it, or add a new one at the top (newest first). */
  const upsert = useCallback((kindId: ListingKindId, listing: Listing) => {
    setByKind((current) => {
      const existing = current[kindId]?.listings ?? []
      const listings = existing.some((item) => item.id === listing.id)
        ? existing.map((item) => (item.id === listing.id ? listing : item))
        : [listing, ...existing]
      return { ...current, [kindId]: { listings, error: null } }
    })
  }, [])

  const get = (kindId: ListingKindId): KindListings => byKind[kindId] ?? { listings: null, error: null }

  return { get, reload: load, upsert }
}
