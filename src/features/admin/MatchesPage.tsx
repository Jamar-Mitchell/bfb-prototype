import { useEffect, useState } from 'react'
import { ArrowRight, Link2, Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { EmptyState, ErrorState, LoadingState, showErrorToast } from '../../components/feedback'
import { toApiError } from '../../lib/api/errors'
import { FitBandBadge } from '../matching/FitDisplay'
import { MATCH_STATUS_LABELS, type MatchStatus } from '../matching/fitCopy'
import { AdminTabs } from './AdminTabs'
import { formatDateTime } from './adminDisplay'
import { listApprovedBusinesses, listMatches, type ApprovedBusiness, type MatchFilters, type MatchSummary } from './matchesApi'
import { formatDate, MatchStatusBadge, responseLabel } from './matchDisplay'
import './Admin.css'

const STATUSES = Object.keys(MATCH_STATUS_LABELS) as MatchStatus[]

/** `?status=` and `?business=` as filters. Unknown statuses are ignored. */
export function readMatchFilters(params: URLSearchParams): MatchFilters {
  const status = params.get('status')
  const business = params.get('business')
  return {
    ...(status && (STATUSES as string[]).includes(status) ? { status: status as MatchStatus } : {}),
    ...(business ? { businessId: business } : {}),
  }
}

interface ListState {
  items: MatchSummary[]
  nextCursor: string | null
}

/** `/admin/matches`: every concierge match, newest first, filtered by status and business. */
export function MatchesPage() {
  const [params, setParams] = useSearchParams()
  const filters = readMatchFilters(params)
  const { status, businessId } = filters
  const [list, setList] = useState<ListState | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const businesses = useApprovedBusinesses()

  useEffect(() => {
    let live = true
    setList(null)
    setError(null)
    listMatches({ status, businessId })
      .then((page) => {
        if (live) setList({ items: page.items, nextCursor: page.next_cursor })
      })
      .catch((caught: unknown) => {
        if (live) setError(toApiError(caught))
      })
    return () => {
      live = false
    }
  }, [status, businessId, reloadKey])

  const setFilter = (key: 'status' | 'business', value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  const loadMore = async () => {
    if (!list?.nextCursor) return
    setLoadingMore(true)
    try {
      const page = await listMatches({ status, businessId }, list.nextCursor)
      setList({ items: [...list.items, ...page.items], nextCursor: page.next_cursor })
    } catch (caught) {
      const failure = toApiError(caught)
      // A stale cursor cannot be resumed: start the list again.
      if (failure.code === 'invalid_cursor') setReloadKey((key) => key + 1)
      else showErrorToast(failure.userMessage)
    } finally {
      setLoadingMore(false)
    }
  }

  const filterName = businessId ? businessName(businessId, businesses, list?.items) : null
  const filtered = Boolean(status || businessId)

  return (
    <>
      <div className="page-heading">
        <div>
          <span>ADMIN · MATCHES</span>
          <h1>Concierge matches.</h1>
          <p>Introductions staff have proposed between approved businesses, newest first.</p>
        </div>
        <Link className="button button-primary" to={businessId ? `${paths.adminNewMatch}?business=${businessId}` : paths.adminNewMatch}>
          <Plus size={16} aria-hidden="true" /> New match
        </Link>
      </div>
      <AdminTabs />
      <div className="admin-filters" role="group" aria-label="Filter matches">
        <label className="admin-filter">
          <span>Status</span>
          <select value={status ?? ''} onChange={(event) => setFilter('status', event.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((value) => <option key={value} value={value}>{MATCH_STATUS_LABELS[value]}</option>)}
          </select>
        </label>
        <label className="admin-filter">
          <span>Business</span>
          <select value={businessId ?? ''} onChange={(event) => setFilter('business', event.target.value)}>
            <option value="">All businesses</option>
            {businessId && !businesses?.some((business) => business.id === businessId) && <option value={businessId}>{filterName}</option>}
            {businesses?.map((business) => <option key={business.id} value={business.id}>{business.display_name}</option>)}
          </select>
        </label>
        {filtered && (
          <button type="button" className="button button-secondary button-small" onClick={() => setParams({})}>Clear filters</button>
        )}
      </div>
      {error ? (
        <ErrorState title="We couldn’t load matches" error={error} onRetry={() => setReloadKey((key) => key + 1)} />
      ) : !list ? (
        <LoadingState label="Loading matches…" />
      ) : list.items.length === 0 ? (
        <EmptyState
          className="admin-card"
          icon={Link2}
          title={filtered ? 'No matches with these filters' : 'No matches yet'}
          description={filtered ? 'Try another status or business, or clear the filters.' : 'Create a match from a business’s suggested fits.'}
        />
      ) : (
        <section className="admin-card" aria-labelledby="admin-matches-title">
          <div className="admin-card-head">
            <h2 id="admin-matches-title">{status ? MATCH_STATUS_LABELS[status] : 'All matches'}{filterName ? ` · ${filterName}` : ''}</h2>
            <p>Each match pairs offers of one business with needs of the other.</p>
          </div>
          <ul className="admin-queue" aria-label="Matches">
            {list.items.map((match) => <MatchRow key={match.id} match={match} />)}
          </ul>
          {list.nextCursor && (
            <div className="admin-pagination">
              <span>Showing {list.items.length === 1 ? '1 match' : `${list.items.length} matches`}</span>
              <button type="button" className="button button-secondary button-small" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </section>
      )}
    </>
  )
}

function MatchRow({ match }: { match: MatchSummary }) {
  const names = `${match.business_a.display_name} and ${match.business_b.display_name}`
  return (
    <li className="admin-queue-row match-row">
      <div className="match-row-marks" aria-hidden="true"><Link2 size={18} /></div>
      <div className="admin-queue-main">
        <strong>{match.business_a.display_name} <span className="match-row-amp">&amp;</span> {match.business_b.display_name}</strong>
        <small>
          {match.business_a.display_name}: {responseLabel(match.business_a_response, match.status)} · {match.business_b.display_name}: {responseLabel(match.business_b_response, match.status)}
        </small>
        <small>
          Created {formatDateTime(match.created_at)} ·{' '}
          {match.status === 'proposed' ? `Expires ${formatDate(match.expires_at)}` : match.closed_at ? `Closed ${formatDate(match.closed_at)}` : null}
          {' · '}{match.component_count === 1 ? 'One offer-need pair' : `${match.component_count} offer-need pairs`}
        </small>
        <div className="admin-tags">
          <MatchStatusBadge status={match.status} />
          <FitBandBadge band={match.fit_band} />
        </div>
      </div>
      <div className="admin-queue-side">
        <Link className="button button-secondary button-small" to={paths.adminMatch(match.id)} aria-label={`Open match between ${names}`}>
          Open <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </li>
  )
}

/** Approved businesses for the business filter, or `null` while loading or if they could not load. */
export function useApprovedBusinesses(): ApprovedBusiness[] | null {
  const [businesses, setBusinesses] = useState<ApprovedBusiness[] | null>(null)
  useEffect(() => {
    let live = true
    listApprovedBusinesses()
      .then((items) => {
        if (live) setBusinesses(items)
      })
      .catch(() => {
        // The filter still works for a business picked elsewhere; the list is a convenience.
      })
    return () => {
      live = false
    }
  }, [])
  return businesses
}

function businessName(id: string, businesses: ApprovedBusiness[] | null, matches: MatchSummary[] | undefined): string {
  const known = businesses?.find((business) => business.id === id)?.display_name
  if (known) return known
  const match = matches?.find((item) => item.business_a.id === id || item.business_b.id === id)
  if (match) return match.business_a.id === id ? match.business_a.display_name : match.business_b.display_name
  return 'Selected business'
}
