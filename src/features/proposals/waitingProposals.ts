import { useEffect } from 'react'
import { create } from 'zustand'

import { countWaitingProposals } from './proposalsApi'

/**
 * Proposals waiting on the active business's answer, for the sidebar. Shared, so sending or
 * answering a proposal updates it. `null` until loaded, or when it could not be loaded (the
 * count is a hint: it simply stays hidden).
 */
interface WaitingProposalsState {
  businessId: string | null
  count: number | null
}

export const useWaitingProposalsStore = create<WaitingProposalsState>(() => ({ businessId: null, count: null }))

let latest = 0

/** Reload the count for a business. Answers that arrive after a newer request are dropped. */
export async function refreshWaitingProposals(businessId: string): Promise<void> {
  const request = ++latest
  if (useWaitingProposalsStore.getState().businessId !== businessId) useWaitingProposalsStore.setState({ businessId, count: null })
  try {
    const count = await countWaitingProposals(businessId)
    if (request === latest) useWaitingProposalsStore.setState({ businessId, count })
  } catch {
    if (request === latest) useWaitingProposalsStore.setState({ businessId, count: null })
  }
}

export function resetWaitingProposals() {
  latest += 1
  useWaitingProposalsStore.setState({ businessId: null, count: null })
}

/** Loads the count for `businessId` whenever it changes. The app shell calls it once. */
export function useLoadWaitingProposals(businessId: string | null) {
  useEffect(() => {
    if (businessId) void refreshWaitingProposals(businessId)
  }, [businessId])
}

/** The loaded count for `businessId`; `null` while not known. */
export function useWaitingProposals(businessId: string | null): number | null {
  const current = useWaitingProposalsStore((state) => state.businessId === businessId)
  const count = useWaitingProposalsStore((state) => state.count)
  return current ? count : null
}
