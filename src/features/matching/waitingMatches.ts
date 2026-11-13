import { useEffect } from 'react'
import { create } from 'zustand'

import { countWaitingMatches, type BusinessMatchSummary } from './matchInboxApi'

/**
 * Open matches waiting on the active business's answer, for the sidebar and the dashboard.
 * Shared, so answering a match on its page updates both. `null` until loaded, or when it
 * could not be loaded (the count is a hint: it simply stays hidden).
 */
interface WaitingMatchesState {
  businessId: string | null
  count: number | null
  /** The newest match waiting on an answer, for the dashboard. */
  first: BusinessMatchSummary | null
}

export const useWaitingMatchesStore = create<WaitingMatchesState>(() => ({ businessId: null, count: null, first: null }))

let latest = 0

/** Reload the count for a business. Answers that arrive after a newer request are dropped. */
export async function refreshWaitingMatches(businessId: string): Promise<void> {
  const request = ++latest
  if (useWaitingMatchesStore.getState().businessId !== businessId) useWaitingMatchesStore.setState({ businessId, count: null, first: null })
  try {
    const { count, first } = await countWaitingMatches(businessId)
    if (request === latest) useWaitingMatchesStore.setState({ businessId, count, first })
  } catch {
    if (request === latest) useWaitingMatchesStore.setState({ businessId, count: null, first: null })
  }
}

export function resetWaitingMatches() {
  latest += 1
  useWaitingMatchesStore.setState({ businessId: null, count: null, first: null })
}

/** Loads the count for `businessId` whenever it changes. The app shell calls it once. */
export function useLoadWaitingMatches(businessId: string | null) {
  useEffect(() => {
    if (businessId) void refreshWaitingMatches(businessId)
  }, [businessId])
}

/** The loaded count and newest waiting match for `businessId`; `null` while not known. */
export function useWaitingMatches(businessId: string | null) {
  const current = useWaitingMatchesStore((state) => state.businessId === businessId)
  const count = useWaitingMatchesStore((state) => state.count)
  const first = useWaitingMatchesStore((state) => state.first)
  return current ? { count, first } : { count: null, first: null }
}
