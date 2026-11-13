import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, FileSearch, Info, PackageCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback'
import { toApiError } from '../../lib/api/errors'
import { useActiveBusiness } from '../../lib/businesses/useActiveBusiness'
import { PublicProfileLink } from '../businesses/PublicProfileLink'
import { MatchBusinessHeader } from '../matching/MatchCard'
import { formatMatchDate } from '../matching/matchInboxDisplay'
import { formatFullDate } from '../proposals/proposalCopy'
import { deliveryLine, EXCHANGE_STATUS_LABELS, MILESTONE_STATUS_LABELS, milestoneCount } from './exchangeCopy'
import { getExchange, type Exchange, type ExchangeMilestone } from './exchangesApi'
import '../matching/MatchInbox.css'
import '../proposals/Proposals.css'
import '../proposals/ProposalReview.css'
import './ExchangesPage.css'

/**
 * `/exchanges/:id`: an active exchange and its milestones, each with who delivers it, its due
 * date and what counts as done. Read-only until delivery (Phase 6).
 */
export function ExchangePage() {
  const { exchangeId = '' } = useParams()
  return <ExchangeView key={exchangeId} exchangeId={exchangeId} />
}

function ExchangeView({ exchangeId }: { exchangeId: string }) {
  const business = useActiveBusiness()
  const [exchange, setExchange] = useState<Exchange | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let live = true
    setLoadError(null)
    getExchange(business.id, exchangeId)
      .then((result) => {
        if (live) setExchange(result)
      })
      .catch((error: unknown) => {
        if (live) setLoadError(toApiError(error))
      })
    return () => {
      live = false
    }
  }, [business.id, exchangeId, reloadKey])

  const back = <Link className="back-button match-back" to={paths.exchanges}><ArrowLeft size={17} aria-hidden="true" /> Back to exchanges</Link>

  if (!exchange) {
    const notFound = loadError !== null && toApiError(loadError).code === 'not_found'
    return (
      <>
        {back}
        {notFound ? (
          <EmptyState
            icon={FileSearch}
            title="We couldn’t find this exchange"
            description={`Only the two businesses in an exchange can open it. Check the link, or whether you’re acting for the right business (you’re acting for ${business.name}).`}
            action={<Link className="button button-secondary button-small" to={paths.exchanges}>See your exchanges</Link>}
          />
        ) : loadError ? (
          <ErrorState title="We couldn’t load this exchange" error={loadError} onRetry={() => setReloadKey((key) => key + 1)} />
        ) : (
          <LoadingState label="Loading exchange…" />
        )}
      </>
    )
  }

  const other = exchange.other_business
  const names = { mine: business.name, other: other.display_name }
  const mine = exchange.milestones.filter((milestone) => milestone.responsible_business_id === business.id).length

  return (
    <>
      {back}
      <div className="page-heading match-heading proposal-heading">
        <div>
          <span>EXCHANGE</span>
          <h1>{other.display_name}</h1>
          <p>Active since {formatMatchDate(exchange.activated_at)}, under the <Link to={paths.agreement(exchange.agreement_id)}>signed agreement</Link>.</p>
        </div>
        <div>
          <div className="match-card-pills">
            <span className={`match-pill exchange-pill-${exchange.status}`}>{EXCHANGE_STATUS_LABELS[exchange.status]}</span>
          </div>
        </div>
      </div>
      <div className="match-layout proposal-review-layout">
        <div className="match-main">
          <section className="match-panel proposal-standing exchange-standing" aria-labelledby="exchange-standing-title">
            <h2 id="exchange-standing-title" className="match-side-title">Where it stands</h2>
            <p>
              Both businesses signed the agreement, so the exchange is active. {business.name} delivers {milestoneCount(mine)} and {other.display_name} delivers {milestoneCount(exchange.milestones.length - mine)}, each by its due date.
            </p>
          </section>
          <section className="match-panel" aria-labelledby="exchange-milestones-title">
            <div className="match-panel-head">
              <h2 id="exchange-milestones-title">Milestones</h2>
              <p>As agreed in the accepted proposal, in order.</p>
            </div>
            <div className="match-panel-body">
              {exchange.milestones.length === 0 ? (
                <p className="exchange-readonly-note">This exchange has no milestones.</p>
              ) : (
                <ol className="exchange-milestones" aria-label="Milestones">
                  {exchange.milestones.map((milestone) => (
                    <MilestoneRow key={milestone.id} milestone={milestone} businessId={business.id} names={names} />
                  ))}
                </ol>
              )}
              <p className="exchange-readonly-note">
                <Info size={14} aria-hidden="true" /> Milestones are read-only for now. Marking work delivered and accepting it comes in a later release.
              </p>
            </div>
          </section>
        </div>
        <aside className="match-side">
          <section className="match-panel match-panel-body" aria-labelledby="exchange-status-title">
            <h2 id="exchange-status-title" className="match-side-title">Status</h2>
            <dl className="match-status-facts">
              <div><dt>Status</dt><dd>{EXCHANGE_STATUS_LABELS[exchange.status]}</dd></div>
              <div><dt>Active since</dt><dd>{formatMatchDate(exchange.activated_at)}</dd></div>
              <div><dt>Next due</dt><dd>{exchange.next_due_date ? formatMatchDate(exchange.next_due_date) : 'Nothing due'}</dd></div>
              <div><dt>Milestones</dt><dd>{exchange.milestone_count}</dd></div>
              <div><dt>Agreement</dt><dd><Link to={paths.agreement(exchange.agreement_id)}>Signed</Link></dd></div>
              <div><dt>Proposal</dt><dd><Link to={paths.proposal(exchange.proposal_id)}>Accepted</Link></dd></div>
            </dl>
          </section>
          <section className="match-panel match-panel-body" aria-labelledby="exchange-other-title">
            <h2 id="exchange-other-title" className="match-side-title">The other business</h2>
            <MatchBusinessHeader business={other} as="h3" />
            <PublicProfileLink businessId={other.id} profileStatus={other.profile_status} />
          </section>
        </aside>
      </div>
    </>
  )
}

function MilestoneRow({ milestone, businessId, names }: { milestone: ExchangeMilestone; businessId: string; names: { mine: string; other: string } }) {
  const delivery = deliveryLine(milestone, businessId, names)
  return (
    <li className={`exchange-milestone ${delivery.mine ? 'exchange-milestone-mine' : ''}`}>
      <span className="exchange-milestone-number" aria-hidden="true">{milestone.sequence}</span>
      <div className="exchange-milestone-body">
        <div className="exchange-milestone-head">
          <h3>{milestone.title}</h3>
          <span className="match-pill">{MILESTONE_STATUS_LABELS[milestone.status]}</span>
        </div>
        <p className="exchange-milestone-meta">
          <span><PackageCheck size={14} aria-hidden="true" /> <strong>{delivery.mine ? 'You deliver' : 'You receive'}</strong> · {delivery.text}</span>
          <span><CalendarDays size={14} aria-hidden="true" /> {milestone.due_date ? `Due ${formatFullDate(milestone.due_date)}` : 'No due date'}</span>
        </p>
        {milestone.description && <p>{milestone.description}</p>}
        {milestone.acceptance_criteria && <p className="exchange-milestone-criteria"><strong>Done when:</strong> {milestone.acceptance_criteria}</p>}
      </div>
    </li>
  )
}
