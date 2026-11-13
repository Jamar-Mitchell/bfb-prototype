import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Ban, Lock } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { ErrorState, LoadingState, showToast } from '../../components/feedback'
import { toApiError } from '../../lib/api/errors'
import { FactorList, FitBandBadge } from '../matching/FitDisplay'
import { DECLINE_REASON_LABELS } from '../matching/fitCopy'
import { formatDateTime } from './adminDisplay'
import { readFeedback } from './matchFeedback'
import { getMatch, withdrawMatch, type AdminMatch, type MatchComponent, type MatchParticipant } from './matchesApi'
import { BusinessMark, businessPlace, formatDate, MatchStatusBadge, responseLabel } from './matchDisplay'
import { NotesDialog, type NotesDialogCopy } from './NotesDialog'
import './Admin.css'

/** `/admin/matches/:id`: both responses, decline reasons, feedback, the pairs and why they fit, and Withdraw. */
export function MatchDetailPage() {
  const { matchId = '' } = useParams()
  const [match, setMatch] = useState<AdminMatch | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [withdrawing, setWithdrawing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  useEffect(() => {
    let live = true
    setLoadError(null)
    getMatch(matchId)
      .then((result) => {
        if (live) setMatch(result)
      })
      .catch((error: unknown) => {
        if (live) setLoadError(toApiError(error))
      })
    return () => {
      live = false
    }
  }, [matchId, reloadKey])

  const back = <Link className="back-button admin-back" to={paths.adminMatches}><ArrowLeft size={17} aria-hidden="true" /> Back to matches</Link>

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

  const withdraw = async (reason: string) => {
    try {
      const updated = await withdrawMatch(match.id, reason)
      setMatch(updated)
      setWithdrawing(false)
      setNotice(null)
      showToast('Match withdrawn.')
    } catch (caught) {
      const error = toApiError(caught)
      if (error.code !== 'invalid_match_status') throw error
      // It closed (accepted, declined or expired) since the page loaded: show it as it is now.
      setWithdrawing(false)
      setNotice('This match is no longer open, so it was not withdrawn. Its current status is shown below.')
      reload()
    }
  }

  const names = `${match.business_a.display_name} & ${match.business_b.display_name}`
  const feedback = readFeedback(match)

  return (
    <>
      {back}
      <div className="page-heading admin-heading">
        <div>
          <span>ADMIN · MATCH</span>
          <h1>{names}</h1>
          <p>Proposed {formatDateTime(match.created_at)} by staff.</p>
        </div>
        <div className="admin-status-pills">
          <MatchStatusBadge status={match.status} />
          <FitBandBadge band={match.fit_band} />
        </div>
      </div>
      {notice && <p className="admin-notice admin-notice-error" role="alert">{notice}</p>}
      <div className="admin-layout">
        <div className="admin-main">
          <section className="admin-card" aria-labelledby="match-note-title">
            <div className="admin-card-head">
              <h2 id="match-note-title">Note for both businesses</h2>
            </div>
            <p className={match.operator_note ? 'admin-description admin-card-body' : 'admin-muted admin-card-body'}>{match.operator_note ?? 'No note.'}</p>
          </section>
          <section className="admin-card" aria-labelledby="match-components-title">
            <div className="admin-card-head">
              <h2 id="match-components-title">Offers and needs</h2>
              <p>As they were when the match was created. Later edits to the listings don’t change why it was made.</p>
            </div>
            <ol className="match-components">
              {match.components.map((component) => <ComponentItem key={component.id} component={component} match={match} />)}
            </ol>
          </section>
          {feedback && (
            <section className="admin-card" aria-labelledby="match-feedback-title">
              <div className="admin-card-head">
                <h2 id="match-feedback-title">Feedback</h2>
                <p><Lock size={12} aria-hidden="true" /> Staff only.</p>
              </div>
              {feedback.length === 0 ? (
                <p className="admin-muted admin-card-body">No feedback yet.</p>
              ) : (
                <ul className="admin-history">
                  {feedback.map((entry) => (
                    <li key={entry.key}>
                      {entry.label && <span className="admin-status">{entry.label}</span>}
                      <small>{[entry.business, entry.at && formatDateTime(entry.at)].filter(Boolean).join(' · ')}</small>
                      {entry.text && <p>{entry.text}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
        <aside className="admin-side">
          <section className="admin-card" aria-labelledby="match-responses-title">
            <div className="admin-card-head">
              <h2 id="match-responses-title">Responses</h2>
              <p>Decline reasons are seen by staff only.</p>
            </div>
            <ul className="admin-history">
              {match.participants.map((participant) => <ParticipantItem key={participant.side} participant={participant} status={match.status} />)}
            </ul>
          </section>
          <section className="admin-card admin-decision" aria-labelledby="match-state-title">
            <h2 id="match-state-title">Status</h2>
            <dl className="match-facts">
              <div><dt>Expires</dt><dd>{formatDateTime(match.expires_at)}</dd></div>
              {match.closed_at && <div><dt>Closed</dt><dd>{formatDateTime(match.closed_at)}</dd></div>}
              <div><dt>Last updated</dt><dd>{formatDateTime(match.updated_at)}</dd></div>
            </dl>
            {match.status === 'withdrawn' && (
              <div className="match-withdrawn">
                <strong>Withdrawn{match.withdrawn_at ? ` ${formatDateTime(match.withdrawn_at)}` : ''}</strong>
                <p>{match.withdrawal_reason ?? 'No reason recorded.'}</p>
              </div>
            )}
            {match.status === 'proposed' ? (
              <>
                <p>Withdrawing closes the match for both businesses. They can no longer accept or decline it.</p>
                <button type="button" className="button button-secondary" onClick={() => setWithdrawing(true)}>
                  <Ban size={16} aria-hidden="true" /> Withdraw match
                </button>
              </>
            ) : (
              <p>This match is closed. Nothing more can change.</p>
            )}
          </section>
        </aside>
      </div>
      {withdrawing && <NotesDialog copy={withdrawCopy(names)} field="reason" onSubmit={withdraw} onCancel={() => setWithdrawing(false)} />}
    </>
  )
}

function withdrawCopy(names: string): NotesDialogCopy {
  return {
    kicker: 'WITHDRAW MATCH',
    title: 'Withdraw this match?',
    intro: `The match between ${names} closes and neither business can respond to it any more.`,
    label: 'Why are you withdrawing it?',
    hint: 'Seen by staff only.',
    confirm: 'Withdraw match',
    busy: 'Withdrawing…',
    requiredMessage: 'Give a reason for withdrawing.',
  }
}

function ParticipantItem({ participant, status }: { participant: MatchParticipant; status: AdminMatch['status'] }) {
  return (
    <li>
      <div className="match-participant">
        <BusinessMark business={participant.business} />
        <div>
          <strong>{participant.business.display_name}</strong>
          <small>{businessPlace(participant.business)}</small>
        </div>
      </div>
      <span className={`admin-status match-response-${participant.response}`}>{responseLabel(participant.response, status)}</span>
      {participant.responded_at && <small>{formatDateTime(participant.responded_at)}</small>}
      {participant.decline_reason && <p><strong>{DECLINE_REASON_LABELS[participant.decline_reason]}</strong></p>}
      {participant.decline_text && <p>{participant.decline_text}</p>}
    </li>
  )
}

/** A string from a component snapshot (`offer` / `need` are free-form objects in the schema). */
function snapshotText(snapshot: Record<string, unknown>, key: string): string | null {
  const value = snapshot[key]
  return typeof value === 'string' && value ? value : null
}

function ComponentItem({ component, match }: { component: MatchComponent; match: AdminMatch }) {
  const [provider, client] = component.direction === 'a_to_b' ? [match.business_a, match.business_b] : [match.business_b, match.business_a]
  const offerTitle = snapshotText(component.offer, 'title') ?? 'Offer'
  const needTitle = snapshotText(component.need, 'title') ?? 'Need'
  const category = snapshotText(component.offer, 'category_name')
  return (
    <li className="match-pair">
      <div className="match-pair-titles">
        <span><small>Offer from {provider.display_name}</small><strong>{offerTitle}</strong></span>
        <ArrowRight size={16} aria-hidden="true" />
        <span><small>Need from {client.display_name}</small><strong>{needTitle}</strong></span>
      </div>
      <div className="match-pair-meta">
        {category && <span className="admin-tag">{category}</span>}
        <FitBandBadge band={component.fit_band} />
        {component.evaluated_on && <small>Checked {formatDate(component.evaluated_on)}</small>}
      </div>
      <FactorList factors={component.factors} label={`Why ${offerTitle} fits ${needTitle}`} />
    </li>
  )
}
