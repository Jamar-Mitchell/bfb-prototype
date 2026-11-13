import { useCallback, useEffect, useState } from 'react'
import { Link2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { EmptyState, ErrorState, LoadingState, showErrorToast } from '../../components/feedback'
import { toApiError } from '../../lib/api/errors'
import { useActiveBusiness } from '../../lib/businesses/useActiveBusiness'
import { topReasons } from './fitCopy'
import { MatchCard, type CardReasons } from './MatchCard'
import { getBusinessMatch, INBOX_TABS, listInbox, readInboxTab, type BusinessMatchSummary, type InboxTab } from './matchInboxApi'
import { useWaitingMatches } from './waitingMatches'
import './MatchInbox.css'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; error: unknown }
  | { kind: 'ready'; items: BusinessMatchSummary[]; nextCursor: string | null; loadingMore: boolean }

const EMPTY: Record<InboxTab, { title: string; description: string }> = {
  open: {
    title: 'No open matches',
    description: 'When BFB introduces your business to another one, the match shows here with the reasons behind it.',
  },
  accepted: {
    title: 'No accepted matches yet',
    description: 'Matches both businesses accept move here.',
  },
  closed: {
    title: 'No closed matches',
    description: 'Declined, expired and withdrawn matches move here.',
  },
}

/** `/matches`: the active business's matches by tab, each card with the fit in words and why. */
export function MatchInboxPage() {
  const business = useActiveBusiness()
  const [params, setParams] = useSearchParams()
  const tab = readInboxTab(params.get('tab'))
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [reasons, setReasons] = useState<Record<string, CardReasons>>({})
  const [reloadKey, setReloadKey] = useState(0)
  const { count: waiting } = useWaitingMatches(business.id)

  // The list carries no factors, so each card's reasons come from the match's detail.
  const loadReasons = useCallback(
    (items: BusinessMatchSummary[], isLive: () => boolean) => {
      setReasons((current) => ({ ...current, ...Object.fromEntries(items.map((item) => [item.id, current[item.id] ?? 'loading'])) }))
      for (const item of items) {
        getBusinessMatch(business.id, item.id)
          .then((match) => {
            if (isLive()) setReasons((current) => ({ ...current, [item.id]: topReasons(match.components) }))
          })
          .catch(() => {
            if (isLive()) setReasons((current) => ({ ...current, [item.id]: 'unavailable' }))
          })
      }
    },
    [business.id],
  )

  useEffect(() => {
    let live = true
    setState({ kind: 'loading' })
    listInbox(business.id, tab)
      .then((page) => {
        if (!live) return
        setState({ kind: 'ready', items: page.items, nextCursor: page.nextCursor, loadingMore: false })
        loadReasons(page.items, () => live)
      })
      .catch((error: unknown) => {
        if (live) setState({ kind: 'error', error })
      })
    return () => {
      live = false
    }
  }, [business.id, tab, reloadKey, loadReasons])

  const loadMore = async () => {
    if (state.kind !== 'ready' || !state.nextCursor) return
    setState({ ...state, loadingMore: true })
    try {
      const page = await listInbox(business.id, tab, state.nextCursor)
      setState((current) =>
        current.kind === 'ready'
          ? { kind: 'ready', items: [...current.items, ...page.items.filter((item) => !current.items.some((seen) => seen.id === item.id))], nextCursor: page.nextCursor, loadingMore: false }
          : current,
      )
      loadReasons(page.items, () => true)
    } catch (error) {
      setState((current) => (current.kind === 'ready' ? { ...current, loadingMore: false } : current))
      showErrorToast(`We couldn’t load more matches. ${toApiError(error).userMessage}`)
    }
  }

  const chooseTab = (next: InboxTab) => setParams(next === 'open' ? {} : { tab: next }, { replace: true })

  return (
    <>
      <div className="page-heading">
        <div>
          <span>MATCHES</span>
          <h1>Businesses BFB picked for you.</h1>
          <p>Each match comes with the reasons behind it. Answer before it expires.</p>
        </div>
      </div>
      <div className="match-tabs" role="tablist" aria-label="Matches">
        {INBOX_TABS.map(({ id, label }) => (
          <button key={id} type="button" role="tab" id={`match-tab-${id}`} aria-selected={tab === id} aria-controls="match-tab-panel" onClick={() => chooseTab(id)}>
            {label}
            {id === 'open' && waiting ? <span className="match-tab-count" aria-label={`${waiting} waiting on you`}>{waiting}</span> : null}
          </button>
        ))}
      </div>
      <div id="match-tab-panel" role="tabpanel" aria-labelledby={`match-tab-${tab}`}>
        {state.kind === 'loading' && <LoadingState label="Loading matches…" />}
        {state.kind === 'error' && <ErrorState title="We couldn’t load your matches" error={state.error} onRetry={() => setReloadKey((key) => key + 1)} />}
        {state.kind === 'ready' && state.items.length === 0 && (
          <EmptyState
            icon={Link2}
            title={EMPTY[tab].title}
            description={EMPTY[tab].description}
            action={tab === 'open' ? <Link className="button button-secondary button-small" to={paths.listings}>Review your offers and needs</Link> : undefined}
          />
        )}
        {state.kind === 'ready' && state.items.length > 0 && (
          <>
            <ul className="match-list" aria-label={`${INBOX_TABS.find(({ id }) => id === tab)?.label} matches`}>
              {state.items.map((item) => <MatchCard key={item.id} match={item} reasons={reasons[item.id] ?? 'loading'} />)}
            </ul>
            {state.nextCursor && (
              <div className="match-more">
                <button type="button" className="button button-secondary" onClick={() => void loadMore()} disabled={state.loadingMore}>
                  {state.loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
