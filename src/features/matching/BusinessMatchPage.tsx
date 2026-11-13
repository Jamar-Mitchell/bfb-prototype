import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Quote } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { ErrorState, LoadingState } from '../../components/feedback'
import { toApiError } from '../../lib/api/errors'
import { useActiveBusiness } from '../../lib/businesses/useActiveBusiness'
import { PublicProfileLink } from '../businesses/PublicProfileLink'
import { FactorList, FitBandBadge } from './FitDisplay'
import { MATCH_RESPONSE_LABELS, MATCH_STATUS_LABELS, type MatchResponse, type MatchStatus } from './fitCopy'
import { MatchBusinessHeader } from './MatchCard'
import { getBusinessMatch, type BusinessMatch, type BusinessMatchComponent } from './matchInboxApi'
import { formatMatchDate, snapshotFacts, snapshotText } from './matchInboxDisplay'
import './MatchInbox.css'

/** `/matches/:id`: why the two businesses were matched, pair by pair, and where it stands. */
export function BusinessMatchPage() {
  const { matchId = '' } = useParams()
  const business = useActiveBusiness()
  const [match, setMatch] = useState<BusinessMatch | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  useEffect(() => {
    let live = true
    setLoadError(null)
    getBusinessMatch(business.id, matchId)
      .then((result) => {
        if (live) setMatch(result)
      })
      .catch((error: unknown) => {
        if (live) setLoadError(toApiError(error))
      })
    return () => {
      live = false
    }
  }, [business.id, matchId, reloadKey])

  const back = <Link className="back-button match-back" to={paths.matches}><ArrowLeft size={17} aria-hidden="true" /> Back to matches</Link>

  if (!match) {
    const notFound = loadError !== null && toApiError(loadError).code === 'not_found'
    return (
      <>
        {back}
        {loadError ? (
          <ErrorState title={notFound ? 'This match doesn’t exist' : 'We couldn’t load this match'} error={loadError} onRetry={notFound ? undefined : reload} />
        ) : (
          <LoadingState label="Loading match…" />
        )}
      </>
    )
  }

  const other = match.other.business

  return (
    <>
      {back}
      <div className="page-heading match-heading">
        <div>
          <span>MATCH</span>
          <h1>{other.display_name}</h1>
          <p>Introduced by BFB on {formatMatchDate(match.created_at)}.</p>
        </div>
        {/* Wrapped: the page heading styles its own direct spans as a small label. */}
        <div>
          <div className="match-card-pills">
            <span className={`match-pill match-pill-${match.status}`}>{MATCH_STATUS_LABELS[match.status]}</span>
            <FitBandBadge band={match.fit_band} />
          </div>
        </div>
      </div>
      <div className="match-layout">
        <div className="match-main">
          {match.operator_note && (
            <section className="match-panel match-note" aria-labelledby="match-note-title">
              <h2 id="match-note-title"><Quote size={15} aria-hidden="true" /> A note from BFB</h2>
              <p>{match.operator_note}</p>
            </section>
          )}
          <section className="match-panel" aria-labelledby="match-pairs-title">
            <div className="match-panel-head">
              <h2 id="match-pairs-title">Why you were matched</h2>
              <p>Each offer and need as they were when BFB made the match, and how they line up.</p>
            </div>
            <ol className="match-detail-pairs">
              {match.components.map((component) => <PairItem key={component.id} component={component} otherName={other.display_name} />)}
            </ol>
          </section>
        </div>
        <aside className="match-side">
          <section className="match-panel match-panel-body" aria-labelledby="match-other-title">
            <h2 id="match-other-title" className="match-side-title">The other business</h2>
            <MatchBusinessHeader business={other} as="h3" />
            <PublicProfileLink businessId={other.id} profileStatus={other.profile_status} />
          </section>
          <section className="match-panel" aria-labelledby="match-responses-title">
            <div className="match-panel-head">
              <h2 id="match-responses-title">Responses</h2>
            </div>
            <ul className="match-responses" aria-label="Responses">
              <ResponseItem who={`${match.me.business.display_name} (you)`} response={match.me.response} at={match.me.responded_at} status={match.status} />
              <ResponseItem who={other.display_name} response={match.other.response} at={match.other.responded_at} status={match.status} />
            </ul>
          </section>
          <section className="match-panel match-panel-body" aria-labelledby="match-status-title">
            <h2 id="match-status-title" className="match-side-title">Status</h2>
            <dl className="match-status-facts">
              <div><dt>Status</dt><dd>{MATCH_STATUS_LABELS[match.status]}</dd></div>
              {match.status === 'proposed' ? (
                <div><dt>Respond by</dt><dd>{formatMatchDate(match.expires_at)}</dd></div>
              ) : (
                match.closed_at && <div><dt>Closed</dt><dd>{formatMatchDate(match.closed_at)}</dd></div>
              )}
            </dl>
          </section>
        </aside>
      </div>
    </>
  )
}

/** A response, or "No response" once the match closed without one. */
function ResponseItem({ who, response, at, status }: { who: string; response: MatchResponse; at: string | null; status: MatchStatus }) {
  const label = response === 'pending' && status !== 'proposed' ? 'No response' : MATCH_RESPONSE_LABELS[response]
  return (
    <li>
      <strong>{who}</strong>
      <span className={`match-pill match-pill-response-${response}`}>{label}</span>
      {at && <small>{formatMatchDate(at)}</small>}
    </li>
  )
}

function PairItem({ component, otherName }: { component: BusinessMatchComponent; otherName: string }) {
  const provider = component.my_role === 'provider'
  const offerTitle = snapshotText(component.offer, 'title') ?? 'Offer'
  const needTitle = snapshotText(component.need, 'title') ?? 'Need'
  return (
    <li className="match-detail-pair">
      <div className="match-sides">
        <ListingSide kind="offer" owner={provider ? 'Your offer' : `${otherName}’s offer`} snapshot={component.offer} />
        <ArrowRight className="match-sides-arrow" size={18} aria-hidden="true" />
        <ListingSide kind="need" owner={provider ? `${otherName}’s need` : 'Your need'} snapshot={component.need} />
      </div>
      <div className="match-pair-fit">
        <FitBandBadge band={component.fit_band} />
        {component.evaluated_on && <small>Checked {formatMatchDate(component.evaluated_on)}</small>}
      </div>
      <FactorList factors={component.factors} label={`How ${offerTitle} fits ${needTitle}`} />
    </li>
  )
}

function ListingSide({ kind, owner, snapshot }: { kind: 'offer' | 'need'; owner: string; snapshot: Record<string, unknown> }) {
  const category = snapshotText(snapshot, 'category_name')
  return (
    <div className={`match-listing match-listing-${kind}`}>
      <small>{owner}</small>
      <strong>{snapshotText(snapshot, 'title') ?? (kind === 'offer' ? 'Offer' : 'Need')}</strong>
      {category && <span className="match-listing-category">{category}</span>}
      <dl>
        {snapshotFacts(kind, snapshot).map((fact) => (
          <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>
        ))}
      </dl>
    </div>
  )
}
