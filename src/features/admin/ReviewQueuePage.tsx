import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, ClipboardCheck, TriangleAlert } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback'
import { toApiError } from '../../lib/api/errors'
import { businessInitials } from '../businesses/businessDisplay'
import type { AdminBusinessLocationState } from './AdminBusinessPage'
import { listReviewQueue, QUEUE_PAGE_SIZE, type ReviewQueue, type ReviewQueueItem } from './adminApi'
import { formatDateTime } from './adminDisplay'
import './Admin.css'

/** `?page=` as a page number from 1. Anything else is page 1. */
function readPage(params: URLSearchParams): number {
  const page = Number(params.get('page'))
  return Number.isInteger(page) && page > 1 ? page : 1
}

/** `/admin`: businesses waiting for review, oldest submission first, 20 per page. */
export function ReviewQueuePage() {
  const [params, setParams] = useSearchParams()
  const page = readPage(params)
  const [queue, setQueue] = useState<ReviewQueue | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const goToPage = useCallback(
    (next: number) => setParams(next > 1 ? { page: String(next) } : {}, { replace: false }),
    [setParams],
  )

  useEffect(() => {
    let live = true
    setQueue(null)
    setError(null)
    listReviewQueue({ offset: (page - 1) * QUEUE_PAGE_SIZE })
      .then((result) => {
        if (!live) return
        // A decision can empty the last page: step back to the last page that has businesses.
        if (result.items.length === 0 && result.total > 0 && page > 1) {
          setParams(lastPageParams(result.total), { replace: true })
          return
        }
        setQueue(result)
      })
      .catch((caught: unknown) => {
        if (live) setError(toApiError(caught))
      })
    return () => {
      live = false
    }
  }, [page, reloadKey, setParams])

  return (
    <>
      <div className="page-heading">
        <div>
          <span>ADMIN · REVIEW QUEUE</span>
          <h1>Businesses waiting for review.</h1>
          <p>Check each profile, then approve it or ask for changes. Oldest submissions first.</p>
        </div>
      </div>
      {error ? (
        <ErrorState title="We couldn’t load the review queue" error={error} onRetry={() => setReloadKey((key) => key + 1)} />
      ) : !queue ? (
        <LoadingState label="Loading the review queue…" />
      ) : queue.total === 0 ? (
        <EmptyState
          className="admin-card"
          icon={ClipboardCheck}
          title="No businesses waiting for review"
          description="New submissions appear here as soon as a business submits its profile."
        />
      ) : (
        <section className="admin-card" aria-labelledby="admin-queue-title">
          <div className="admin-card-head">
            <h2 id="admin-queue-title">In review</h2>
            <p>{queue.total === 1 ? '1 business' : `${queue.total} businesses`} waiting</p>
          </div>
          <ul className="admin-queue">
            {queue.items.map((item) => <QueueRow key={item.id} item={item} />)}
          </ul>
          <Pagination queue={queue} page={page} goToPage={goToPage} />
        </section>
      )}
    </>
  )
}

function lastPageParams(total: number): Record<string, string> {
  const last = Math.max(1, Math.ceil(total / QUEUE_PAGE_SIZE))
  return last > 1 ? { page: String(last) } : {}
}

function QueueRow({ item }: { item: ReviewQueueItem }) {
  const { pathname, search } = useLocation()
  // A decision on the detail page returns to this page of the queue.
  const state: AdminBusinessLocationState = { queue: `${pathname}${search}` }
  return (
    <li className="admin-queue-row">
      <div className="admin-initials" aria-hidden="true">{businessInitials(item.display_name)}</div>
      <div className="admin-queue-main">
        <strong>{item.display_name}</strong>
        {item.legal_name && <span>{item.legal_name}</span>}
        <small>
          {item.submitted_for_review_at ? `Submitted ${formatDateTime(item.submitted_for_review_at)}` : 'Not submitted'}
          {item.latest_review?.decision === 'changes_requested' && ' · Resubmitted after changes'}
        </small>
        {(item.categories.length > 0 || item.requires_additional_review) && (
          <div className="admin-tags">
            {item.requires_additional_review && (
              <span className="admin-flag"><TriangleAlert size={12} aria-hidden="true" /> Needs extra review</span>
            )}
            {item.categories.map((category) => (
              <span key={category.id} className={item.flagged_categories.some((flagged) => flagged.id === category.id) ? 'admin-tag admin-tag-flagged' : 'admin-tag'}>
                {category.name}
              </span>
            ))}
            {/* Flagged categories used only by offers or needs are not in the profile's own list. */}
            {item.flagged_categories
              .filter((flagged) => !item.categories.some((category) => category.id === flagged.id))
              .map((flagged) => <span key={flagged.id} className="admin-tag admin-tag-flagged">{flagged.name} (listing)</span>)}
          </div>
        )}
      </div>
      <div className="admin-queue-side">
        <span className="admin-completeness">{item.completeness.score}% complete</span>
        <Link className="button button-secondary button-small" to={paths.adminBusiness(item.id)} state={state} aria-label={`Review ${item.display_name}`}>
          Review <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </li>
  )
}

function Pagination({ queue, page, goToPage }: { queue: ReviewQueue; page: number; goToPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(queue.total / QUEUE_PAGE_SIZE))
  if (pages <= 1) return null
  const first = queue.offset + 1
  const last = queue.offset + queue.items.length

  return (
    <nav className="admin-pagination" aria-label="Review queue pages">
      <span>Showing {first}–{last} of {queue.total}</span>
      <div>
        <button type="button" className="button button-secondary button-small" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
          <ChevronLeft size={15} aria-hidden="true" /> Previous
        </button>
        <span aria-current="page">Page {page} of {pages}</span>
        <button type="button" className="button button-secondary button-small" onClick={() => goToPage(page + 1)} disabled={page >= pages}>
          Next <ChevronRight size={15} aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}
