import { useCallback, useEffect, useRef, useState } from 'react'

import { toApiError, type ApiError } from '../../lib/api/errors'
import { searchFacets, searchListings, type CategoryFacet, type MarketplaceListing } from './marketplaceApi'
import type { SearchQuery } from './marketplaceFilters'

export type SearchState =
  | { status: 'loading' }
  | { status: 'error'; error: ApiError }
  | {
      status: 'ready'
      items: MarketplaceListing[]
      nextCursor: string | null
      loadingMore: boolean
      loadMoreError: ApiError | null
    }

/**
 * Marketplace results for `query`, first page on every change, then "load more" with the
 * cursor. A response for an older query is dropped. A cursor the API no longer accepts
 * (`400 invalid_cursor`) restarts the walk from the first page.
 */
export function useMarketplaceSearch(query: SearchQuery, viewerBusinessId: string) {
  // A stable key, so a new but equal query object does not refetch.
  const key = JSON.stringify(query)
  const [state, setState] = useState<SearchState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  // Bumped by every new first-page request and on unmount: older responses are ignored.
  const generation = useRef(0)

  useEffect(() => {
    const current = ++generation.current
    setState({ status: 'loading' })
    searchListings(JSON.parse(key) as SearchQuery, { viewerBusinessId })
      .then((page) => {
        if (current !== generation.current) return
        setState({ status: 'ready', items: page.items, nextCursor: page.next_cursor, loadingMore: false, loadMoreError: null })
      })
      .catch((error: unknown) => {
        if (current === generation.current) setState({ status: 'error', error: toApiError(error) })
      })
    return () => {
      generation.current++
    }
  }, [key, viewerBusinessId, reloadKey])

  const cursor = state.status === 'ready' && !state.loadingMore ? state.nextCursor : null

  const loadMore = useCallback(async () => {
    if (!cursor) return
    const current = generation.current
    setState((previous) => (previous.status === 'ready' ? { ...previous, loadingMore: true, loadMoreError: null } : previous))
    try {
      const page = await searchListings(JSON.parse(key) as SearchQuery, { viewerBusinessId, cursor })
      if (current !== generation.current) return
      setState((previous) => {
        if (previous.status !== 'ready') return previous
        const seen = new Set(previous.items.map((item) => `${item.kind}:${item.id}`))
        const items = [...previous.items, ...page.items.filter((item) => !seen.has(`${item.kind}:${item.id}`))]
        return { ...previous, items, nextCursor: page.next_cursor, loadingMore: false }
      })
    } catch (error) {
      if (current !== generation.current) return
      const apiError = toApiError(error)
      if (apiError.code === 'invalid_cursor') {
        setReloadKey((value) => value + 1)
        return
      }
      setState((previous) => (previous.status === 'ready' ? { ...previous, loadingMore: false, loadMoreError: apiError } : previous))
    }
  }, [cursor, key, viewerBusinessId])

  const retry = useCallback(() => setReloadKey((value) => value + 1), [])

  return { state, loadMore, retry }
}

/**
 * Listing counts per category for the chips. `null` while loading or when the counts could not
 * be loaded: they are a hint, so the chips simply show without them.
 */
export function useCategoryCounts(query: SearchQuery, viewerBusinessId: string): { counts: Map<string, number> | null; total: number | null } {
  const { category_id: categoryIds, ...rest } = query
  const key = JSON.stringify(rest)
  const [facets, setFacets] = useState<{ key: string; categories: CategoryFacet[] } | null>(null)

  useEffect(() => {
    let live = true
    searchFacets(JSON.parse(key) as SearchQuery, { viewerBusinessId })
      .then((response) => {
        if (live) setFacets({ key, categories: response.categories })
      })
      .catch(() => {
        if (live) setFacets(null)
      })
    return () => {
      live = false
    }
  }, [key, viewerBusinessId])

  if (!facets || facets.key !== key) return { counts: null, total: null }
  const counts = new Map(facets.categories.map((facet) => [facet.category.id, facet.count]))
  // Every listing has one category, so the counts add up to the result total.
  const chosen = categoryIds?.length ? categoryIds : [...counts.keys()]
  const total = chosen.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0)
  return { counts, total }
}
