import { useCallback, useRef, useState } from 'react'

import { showErrorToast } from '../../components/feedback'
import { saveBusiness, unsaveBusiness } from './savedApi'

/**
 * Optimistic save and unsave for the businesses a page shows. The flag flips at once and flips
 * back, with a message, if the API call fails. One call per business at a time: the button is
 * disabled while its call runs, so quick clicks cannot race.
 *
 * `isSaved(id, fromApi)` prefers this page's latest choice over the flag the API returned.
 */
export function useSaveToggle(viewerBusinessId: string | null) {
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const live = useRef(true)

  const isSaved = useCallback((targetId: string, fromApi: boolean | null | undefined) => saved[targetId] ?? Boolean(fromApi), [saved])
  const isPending = useCallback((targetId: string) => Boolean(pending[targetId]), [pending])

  const toggle = useCallback(
    async (targetId: string, name: string, currentlySaved: boolean) => {
      if (!viewerBusinessId || pending[targetId]) return
      const next = !currentlySaved
      setSaved((current) => ({ ...current, [targetId]: next }))
      setPending((current) => ({ ...current, [targetId]: true }))
      try {
        if (next) await saveBusiness(viewerBusinessId, targetId)
        else await unsaveBusiness(viewerBusinessId, targetId)
      } catch {
        if (!live.current) return
        setSaved((current) => ({ ...current, [targetId]: currentlySaved }))
        showErrorToast(next ? `We couldn’t save ${name}. Try again.` : `We couldn’t remove ${name} from your saved businesses. Try again.`)
      } finally {
        if (live.current) setPending((current) => ({ ...current, [targetId]: false }))
      }
    },
    [viewerBusinessId, pending],
  )

  return { isSaved, isPending, toggle }
}
