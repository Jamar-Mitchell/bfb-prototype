import { useCallback, useEffect, useState } from 'react'

import { listActiveExchanges, type ExchangeSummary } from './exchangesApi'

export type ActiveExchanges =
  | { kind: 'loading' }
  | { kind: 'error'; error: unknown }
  | { kind: 'ready'; items: ExchangeSummary[]; more: boolean }

/** The business's newest active exchanges, for the dashboard. Reloads when the business changes. */
export function useActiveExchanges(businessId: string, limit = 20): { state: ActiveExchanges; retry: () => void } {
  const [state, setState] = useState<ActiveExchanges>({ kind: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let live = true
    setState({ kind: 'loading' })
    listActiveExchanges(businessId, { limit })
      .then((page) => {
        if (live) setState({ kind: 'ready', items: page.items, more: page.next_cursor !== null })
      })
      .catch((error: unknown) => {
        if (live) setState({ kind: 'error', error })
      })
    return () => {
      live = false
    }
  }, [businessId, limit, reloadKey])

  return { state, retry: useCallback(() => setReloadKey((key) => key + 1), []) }
}
