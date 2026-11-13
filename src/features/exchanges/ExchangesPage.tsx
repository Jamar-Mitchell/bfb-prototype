import { useEffect, useState } from 'react'
import { ArrowRight, Handshake, ScrollText } from 'lucide-react'
import { Link } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { EmptyState, ErrorState, LoadingState, showErrorToast } from '../../components/feedback'
import { toApiError } from '../../lib/api/errors'
import { useActiveBusiness } from '../../lib/businesses/useActiveBusiness'
import { BusinessLogo } from '../businesses/BusinessLogo'
import { formatLocation } from '../businesses/profileLabels'
import { formatMatchDate } from '../matching/matchInboxDisplay'
import { EXCHANGE_STATUS_LABELS, milestoneCount } from './exchangeCopy'
import { listActiveExchanges, type ExchangeSummary } from './exchangesApi'
import './ExchangesPage.css'

type Tab = 'Active' | 'Completed'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; error: unknown }
  | { kind: 'ready'; items: ExchangeSummary[]; nextCursor: string | null; loadingMore: boolean }

/**
 * `/exchanges`: the active business's exchanges, in the prototype's cards. Exchanges start
 * once both businesses sign an agreement and are read-only until delivery (Phase 6), so
 * Completed stays empty for now.
 */
export function ExchangesPage() {
  const business = useActiveBusiness()
  const [tab, setTab] = useState<Tab>('Active')
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let live = true
    setState({ kind: 'loading' })
    listActiveExchanges(business.id)
      .then((page) => {
        if (live) setState({ kind: 'ready', items: page.items, nextCursor: page.next_cursor, loadingMore: false })
      })
      .catch((error: unknown) => {
        if (live) setState({ kind: 'error', error })
      })
    return () => {
      live = false
    }
  }, [business.id, reloadKey])

  const loadMore = async () => {
    if (state.kind !== 'ready' || !state.nextCursor) return
    setState({ ...state, loadingMore: true })
    try {
      const page = await listActiveExchanges(business.id, { cursor: state.nextCursor })
      setState((current) =>
        current.kind === 'ready'
          ? { kind: 'ready', items: [...current.items, ...page.items.filter((item) => !current.items.some((seen) => seen.id === item.id))], nextCursor: page.next_cursor, loadingMore: false }
          : current,
      )
    } catch (error) {
      setState((current) => (current.kind === 'ready' ? { ...current, loadingMore: false } : current))
      showErrorToast(`We couldn’t load more exchanges. ${toApiError(error).userMessage}`)
    }
  }

  const activeCount = state.kind === 'ready' ? `${state.items.length}${state.nextCursor ? '+' : ''}` : null

  return (
    <>
      <div className="page-heading">
        <div><span>EXCHANGES</span><h1>Keep every trade moving.</h1><p>Every exchange both businesses signed, with the milestones each one delivers.</p></div>
        <Link className="button button-secondary" to={paths.agreements}><ScrollText size={16} aria-hidden="true" /> Agreements</Link>
      </div>
      <div className="exchange-tabs" role="tablist" aria-label="Exchanges">
        {(['Active', 'Completed'] as const).map((item) => (
          <button key={item} type="button" role="tab" id={`exchange-tab-${item}`} aria-selected={tab === item} aria-controls="exchange-tab-panel" className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>
            {item} {item === 'Active' ? activeCount !== null && <span>{activeCount}</span> : <span>0</span>}
          </button>
        ))}
      </div>
      <div id="exchange-tab-panel" role="tabpanel" aria-labelledby={`exchange-tab-${tab}`}>
        {tab === 'Completed' ? (
          <EmptyState icon={Handshake} title="No completed exchanges yet" description="Exchanges move here once both businesses have delivered and accepted every milestone." />
        ) : state.kind === 'loading' ? (
          <LoadingState label="Loading exchanges…" />
        ) : state.kind === 'error' ? (
          <ErrorState title="We couldn’t load your exchanges" error={state.error} onRetry={() => setReloadKey((key) => key + 1)} />
        ) : state.items.length === 0 ? (
          <EmptyState
            icon={Handshake}
            title="No active exchanges yet"
            description="An exchange starts when both businesses sign its agreement. Agreements waiting for signatures are on the Agreements page."
            action={<Link className="button button-secondary button-small" to={paths.agreements}>See your agreements</Link>}
          />
        ) : (
          <>
            <ul className="exchange-page-list" aria-label="Active exchanges">
              {state.items.map((exchange) => <ExchangeCard key={exchange.id} exchange={exchange} />)}
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

function ExchangeCard({ exchange }: { exchange: ExchangeSummary }) {
  const other = exchange.other_business
  const location = formatLocation(other)
  return (
    <li className="exchange-page-card">
      <div className="exchange-card-business">
        <BusinessLogo business={other} />
        <div>
          <span>{other.display_name}</span>
          <strong>Business exchange with {other.display_name}</strong>
          <small>{location ? `${location} · ` : ''}Active since {formatMatchDate(exchange.activated_at)}</small>
        </div>
        <span className="status status-progress">{EXCHANGE_STATUS_LABELS[exchange.status]}</span>
      </div>
      <dl className="exchange-trade-summary exchange-facts">
        <div><dt>MILESTONES</dt><dd>{milestoneCount(exchange.milestone_count)}</dd></div>
        <div><dt>NEXT DUE</dt><dd>{exchange.next_due_date ? formatMatchDate(exchange.next_due_date) : 'Nothing due'}</dd></div>
        <div><dt>ACTIVE SINCE</dt><dd>{formatMatchDate(exchange.activated_at)}</dd></div>
        <div><dt>AGREEMENT</dt><dd>Signed by both</dd></div>
      </dl>
      <div className="exchange-card-actions">
        <Link className="button button-secondary" to={paths.agreement(exchange.agreement_id)}>Signed agreement</Link>
        <Link className="button button-primary" to={paths.exchange(exchange.id)} aria-label={`View exchange with ${other.display_name}`}>View details <ArrowRight size={15} aria-hidden="true" /></Link>
      </div>
    </li>
  )
}
