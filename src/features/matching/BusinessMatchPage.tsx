import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Lock, Quote, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { ErrorState, LoadingState, showErrorToast, showToast } from '../../components/feedback'
import { toApiError, type ApiError } from '../../lib/api/errors'
import { updateBusinessRole } from '../../lib/businesses/activeBusiness'
import { useActiveBusiness } from '../../lib/businesses/useActiveBusiness'
import { PublicProfileLink } from '../businesses/PublicProfileLink'
import { MatchProposalPanel } from '../proposals/MatchProposalPanel'
import '../proposals/Proposals.css'
import { FactorList, FitBandBadge } from './FitDisplay'
import { DeclineMatchDialog } from './DeclineMatchDialog'
import { DECLINE_REASON_LABELS, MATCH_RESPONSE_LABELS, MATCH_STATUS_LABELS, type MatchResponse, type MatchStatus } from './fitCopy'
import { MatchBusinessHeader } from './MatchCard'
import { MatchFeedback } from './MatchFeedback'
import { acceptMatch, declineMatch, getBusinessMatch, saveMatchFeedback, type BusinessMatch, type BusinessMatchComponent, type DeclineBody } from './matchInboxApi'
import { answerConflictMessage, canAnswerMatches } from './matchResponses'
import { refreshWaitingMatches } from './waitingMatches'
import { formatMatchDate, snapshotFacts, snapshotText } from './matchInboxDisplay'
import './MatchInbox.css'

/** `/matches/:id`: why the two businesses were matched, pair by pair, and where it stands. */
export function BusinessMatchPage() {
  const { matchId = '' } = useParams()
  const business = useActiveBusiness()
  const [match, setMatch] = useState<BusinessMatch | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)
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
  const canAnswer = canAnswerMatches(business.role)

  /** An answer was refused: explain it and show the match as it is now. Returns false for other errors. */
  const refused = (error: ApiError): boolean => {
    if (error.code === 'invalid_match_status') {
      setNotice(answerConflictMessage(error, other.display_name))
    } else if (error.code === 'business_role_required') {
      setNotice('Only owners and administrators can accept or decline matches. Your role may have changed.')
      updateBusinessRole(business.id, 'member')
    } else {
      return false
    }
    setDeclining(false)
    reload()
    void refreshWaitingMatches(business.id)
    return true
  }

  const answered = (updated: BusinessMatch, message: string) => {
    setMatch(updated)
    setNotice(null)
    showToast(message)
    void refreshWaitingMatches(business.id)
  }

  const accept = async () => {
    setAccepting(true)
    try {
      const updated = await acceptMatch(business.id, match.id)
      answered(updated, updated.status === 'accepted' ? `You and ${other.display_name} both accepted.` : `Accepted. We’ll let you know when ${other.display_name} answers.`)
    } catch (caught) {
      const error = toApiError(caught)
      if (!refused(error)) showErrorToast(`We couldn’t accept this match. ${error.userMessage}`)
    } finally {
      setAccepting(false)
    }
  }

  const decline = async (body: DeclineBody) => {
    try {
      const updated = await declineMatch(business.id, match.id, body)
      setDeclining(false)
      answered(updated, 'Match declined.')
    } catch (caught) {
      // Shown in the dialog unless the match changed underneath it.
      if (!refused(toApiError(caught))) throw caught
    }
  }

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
      {notice && <p className="match-notice match-notice-error" role="alert">{notice}</p>}
      <div className="match-layout">
        <div className="match-main">
          {match.status === 'accepted' && (
            <MatchProposalPanel
              business={business}
              matchId={match.id}
              otherName={other.display_name}
              proposal={match.proposal ?? null}
              onMatchChanged={(message) => {
                setNotice(message)
                reload()
              }}
            />
          )}
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
          {match.status !== 'withdrawn' && (
            <MatchFeedback
              key={`${match.id}-${match.my_feedback?.updated_at ?? 'none'}`}
              feedback={match.my_feedback}
              onSave={(body) => saveMatchFeedback(business.id, match.id, body)}
              onConflict={(message) => {
                setNotice(message)
                reload()
              }}
            />
          )}
        </div>
        <aside className="match-side">
          {match.status === 'proposed' && (
            <AnswerPanel
              match={match}
              canAnswer={canAnswer}
              businessName={business.name}
              accepting={accepting}
              onAccept={() => void accept()}
              onDecline={() => setDeclining(true)}
            />
          )}
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
              <ResponseItem who={`${match.me.business.display_name} (you)`} response={match.me.response} at={match.me.responded_at} status={match.status}>
                {match.me.decline_reason || match.me.decline_text ? (
                  <div className="match-own-reason">
                    <small><Lock size={11} aria-hidden="true" /> Your reason, seen by BFB only</small>
                    {match.me.decline_reason && <strong>{DECLINE_REASON_LABELS[match.me.decline_reason]}</strong>}
                    {match.me.decline_text && <p>{match.me.decline_text}</p>}
                  </div>
                ) : null}
              </ResponseItem>
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
      {declining && <DeclineMatchDialog otherName={other.display_name} onSubmit={decline} onCancel={() => setDeclining(false)} />}
    </>
  )
}

/** Accept and Decline for owners and administrators; for members, where things stand and who can answer. */
function AnswerPanel({ match, canAnswer, businessName, accepting, onAccept, onDecline }: {
  match: BusinessMatch
  canAnswer: boolean
  businessName: string
  accepting: boolean
  onAccept: () => void
  onDecline: () => void
}) {
  const otherName = match.other.business.display_name
  const otherAccepted = match.other.response === 'accepted'
  let body
  if (!match.can_respond) {
    body = match.me.response === 'accepted'
      ? <p>You accepted{match.me.responded_at ? ` on ${formatMatchDate(match.me.responded_at)}` : ''}. Waiting for {otherName} until {formatMatchDate(match.expires_at)}.</p>
      : <p>Your business has answered this match.</p>
  } else if (!canAnswer) {
    body = (
      <>
        <p>Waiting for {businessName} to answer by {formatMatchDate(match.expires_at)}.</p>
        <p className="match-answer-who"><Lock size={13} aria-hidden="true" /> Only owners and administrators of {businessName} can accept or decline. You can view the match and leave feedback.</p>
      </>
    )
  } else {
    body = (
      <>
        <p>
          {otherAccepted ? `${otherName} has accepted. ` : ''}
          If you both accept, you can start working together. Answer by {formatMatchDate(match.expires_at)}.
        </p>
        <div className="match-answer-actions">
          <button type="button" className="button button-primary" onClick={onAccept} disabled={accepting}>
            <Check size={16} aria-hidden="true" /> {accepting ? 'Accepting…' : 'Accept match'}
          </button>
          <button type="button" className="button button-secondary" onClick={onDecline} disabled={accepting}>
            <X size={16} aria-hidden="true" /> Decline
          </button>
        </div>
      </>
    )
  }
  return (
    <section className="match-panel match-panel-body match-answer" aria-labelledby="match-answer-title">
      <h2 id="match-answer-title" className="match-side-title">Your answer</h2>
      {body}
    </section>
  )
}

/** A response, or "No response" once the match closed without one. */
function ResponseItem({ who, response, at, status, children }: { who: string; response: MatchResponse; at: string | null; status: MatchStatus; children?: React.ReactNode }) {
  const label = response === 'pending' && status !== 'proposed' ? 'No response' : MATCH_RESPONSE_LABELS[response]
  return (
    <li>
      <strong>{who}</strong>
      <span className={`match-pill match-pill-response-${response}`}>{label}</span>
      {at && <small>{formatMatchDate(at)}</small>}
      {children}
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
