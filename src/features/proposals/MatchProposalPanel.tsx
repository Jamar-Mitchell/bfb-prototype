import { useState } from 'react'
import { ArrowRight, CircleCheck, FileSignature, Handshake, Lock, ScrollText } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { showErrorToast, showToast } from '../../components/feedback'
import { toApiError, type ApiError } from '../../lib/api/errors'
import { updateBusinessRole } from '../../lib/businesses/activeBusiness'
import { canAnswerMatches } from '../matching/matchResponses'
import type { SessionBusiness } from '../../stores/session'
import type { components } from '../../lib/api/schema'
import type { AgreementLink } from '../agreements/agreementsApi'
import { PROPOSAL_STATUS_LABELS } from './proposalCopy'
import { isOpen, startProposal } from './proposalsApi'

/** The match's proposal as the match detail carries it: the accepted one, else the newest. */
export type MatchProposal = components['schemas']['MatchProposalResponse']

function detailString(error: ApiError, key: string): string | null {
  const details = error.details
  if (typeof details !== 'object' || details === null) return null
  const value = (details as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : null
}

/**
 * The next step on a match both businesses accepted: "Start a proposal" for owners and
 * administrators, a link to the match's open proposal, or, once both businesses accepted a
 * proposal, links to its agreement and the proposal. `onMatchChanged` reloads the match when
 * the API says it is no longer accepted.
 */
export function MatchProposalPanel({ business, matchId, otherName, proposal, agreement = null, onMatchChanged }: {
  business: SessionBusiness
  matchId: string
  otherName: string
  proposal: MatchProposal | null
  /** The match's agreement, once the accepted proposal produced one. */
  agreement?: AgreementLink | null
  onMatchChanged: (message: string) => void
}) {
  const navigate = useNavigate()
  const [existingId, setExistingId] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const canStart = canAnswerMatches(business.role)

  const start = async () => {
    setStarting(true)
    try {
      const proposal = await startProposal(business.id, matchId)
      showToast(`Proposal started. Only your business can see it until you send it.`)
      navigate(paths.proposalEdit(proposal.id))
    } catch (caught) {
      const error = toApiError(caught)
      const existing = error.code === 'proposal_exists' ? detailString(error, 'proposal_id') : null
      if (existing) {
        setExistingId(existing)
      } else if (error.code === 'invalid_match_status') {
        onMatchChanged('This match is no longer accepted, so a proposal can’t be started.')
      } else if (error.code === 'business_role_required') {
        updateBusinessRole(business.id, 'member')
        showErrorToast('Only owners and administrators can start a proposal. Your role may have changed.')
      } else {
        showErrorToast(`We couldn’t start the proposal. ${error.userMessage}`)
      }
      setStarting(false)
    }
  }

  const accepted = proposal?.status === 'accepted' ? proposal : null
  const open = proposal && isOpen(proposal.status) ? proposal : null
  const closed = proposal && !accepted && !open ? proposal : null
  let body
  if (accepted) {
    body = (
      <>
        <p>
          You and {otherName} accepted version {accepted.accepted_version_number} of the proposal.{' '}
          {agreement ? 'BFB prepared the Business Exchange Agreement from it for both businesses to sign.' : 'BFB is preparing the agreement from it.'}
        </p>
        <div className="match-next-actions">
          {agreement && (
            <Link className="button button-primary button-small" to={paths.agreement(agreement.id)}>
              <ScrollText size={15} aria-hidden="true" /> Open the agreement
            </Link>
          )}
          <Link className={agreement ? 'proposal-version-open' : 'button button-primary button-small'} to={paths.proposal(accepted.id)}>
            Open the proposal <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </>
    )
  } else if (open || existingId) {
    const id = open?.id ?? existingId ?? ''
    body = (
      <>
        <p>{open ? 'There’s an open proposal for this match.' : 'A proposal for this match is already open.'}</p>
        {open && <span className={`match-pill proposal-pill-${open.status}`}>{open.status === 'draft' ? 'Not sent yet' : PROPOSAL_STATUS_LABELS[open.status]}</span>}
        <div className="match-next-actions">
          <Link className="button button-primary button-small" to={paths.proposal(id)}>
            Open the proposal <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </>
    )
  } else {
    body = (
      <>
        <p>
          {closed
            ? `The last proposal was ${PROPOSAL_STATUS_LABELS[closed.status].toLowerCase()}. You can start a new one.`
            : `${otherName} is expecting to hear from you. A proposal sets out who provides what, by when and on what terms.`}
        </p>
        {canStart ? (
          <div className="match-next-actions">
            <button type="button" className="button button-primary button-small" onClick={() => void start()} disabled={starting}>
              <FileSignature size={15} aria-hidden="true" /> {starting ? 'Starting…' : 'Start a proposal'}
            </button>
            {closed && <Link className="proposal-version-open" to={paths.proposal(closed.id)}>See the last proposal</Link>}
          </div>
        ) : (
          <p className="match-answer-who"><Lock size={13} aria-hidden="true" /> Only owners and administrators of {business.name} can start a proposal.</p>
        )}
      </>
    )
  }

  return (
    <section className="match-panel match-next" aria-labelledby="match-next-title">
      {accepted ? <CircleCheck size={22} aria-hidden="true" /> : <Handshake size={22} aria-hidden="true" />}
      <div>
        <h2 id="match-next-title">{accepted ? 'Proposal accepted' : 'You both accepted'}</h2>
        {body}
      </div>
    </section>
  )
}
