import { useEffect, useState } from 'react'
import { ArrowRight, FileSignature, Handshake, Lock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { showErrorToast, showToast } from '../../components/feedback'
import { toApiError, type ApiError } from '../../lib/api/errors'
import { updateBusinessRole } from '../../lib/businesses/activeBusiness'
import { canAnswerMatches } from '../matching/matchResponses'
import type { SessionBusiness } from '../../stores/session'
import { proposalStatusLabel, waitingOnText } from './proposalCopy'
import { findMatchProposal, startProposal, type ProposalStatus, type WaitingOn } from './proposalsApi'

/** The match's proposal as far as this panel needs it. */
interface FoundProposal {
  id: string
  status: ProposalStatus
  waiting_on: WaitingOn | null
}

type Lookup = { kind: 'loading' } | { kind: 'none' } | { kind: 'found'; proposal: FoundProposal } | { kind: 'exists'; proposalId: string }

function detailString(error: ApiError, key: string): string | null {
  const details = error.details
  if (typeof details !== 'object' || details === null) return null
  const value = (details as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : null
}

/**
 * The next step on a match both businesses accepted: "Start a proposal" for owners and
 * administrators, or a link to the match's open proposal. `onMatchChanged` reloads the match
 * when the API says it is no longer accepted.
 */
export function MatchProposalPanel({ business, matchId, otherName, onMatchChanged }: {
  business: SessionBusiness
  matchId: string
  otherName: string
  onMatchChanged: (message: string) => void
}) {
  const navigate = useNavigate()
  const [lookup, setLookup] = useState<Lookup>({ kind: 'loading' })
  const [starting, setStarting] = useState(false)
  const canStart = canAnswerMatches(business.role)

  useEffect(() => {
    let live = true
    findMatchProposal(business.id, matchId)
      .then((found) => {
        if (live) setLookup(found ? { kind: 'found', proposal: found } : { kind: 'none' })
      })
      .catch(() => {
        // Not knowing is fine: starting answers `proposal_exists` with the open one.
        if (live) setLookup({ kind: 'none' })
      })
    return () => {
      live = false
    }
  }, [business.id, matchId])

  const start = async () => {
    setStarting(true)
    try {
      const proposal = await startProposal(business.id, matchId)
      showToast(`Proposal started. Only your business can see it until you send it.`)
      navigate(paths.proposal(proposal.id))
    } catch (caught) {
      const error = toApiError(caught)
      const existing = error.code === 'proposal_exists' ? detailString(error, 'proposal_id') : null
      if (existing) {
        setLookup({ kind: 'exists', proposalId: existing })
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

  let body
  if (lookup.kind === 'found' || lookup.kind === 'exists') {
    const id = lookup.kind === 'found' ? lookup.proposal.id : lookup.proposalId
    const found = lookup.kind === 'found' ? lookup.proposal : null
    const turn = found ? waitingOnText(found, otherName) : null
    body = (
      <>
        <p>
          {lookup.kind === 'exists'
            ? 'A proposal for this match is already open.'
            : found?.status === 'accepted'
              ? `You and ${otherName} accepted a proposal.`
              : `There’s an open proposal for this match.${turn ? ` ${turn}.` : ''}`}
        </p>
        {found && found.status !== 'accepted' && <span className={`match-pill proposal-pill-${found.status}`}>{proposalStatusLabel(found)}</span>}
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
        <p>{otherName} is expecting to hear from you. A proposal sets out who provides what, by when and on what terms.</p>
        {lookup.kind === 'loading' ? (
          <p className="match-answer-who" role="status">Checking for a proposal…</p>
        ) : canStart ? (
          <div className="match-next-actions">
            <button type="button" className="button button-primary button-small" onClick={() => void start()} disabled={starting}>
              <FileSignature size={15} aria-hidden="true" /> {starting ? 'Starting…' : 'Start a proposal'}
            </button>
          </div>
        ) : (
          <p className="match-answer-who"><Lock size={13} aria-hidden="true" /> Only owners and administrators of {business.name} can start a proposal.</p>
        )}
      </>
    )
  }

  return (
    <section className="match-panel match-next" aria-labelledby="match-next-title">
      <Handshake size={22} aria-hidden="true" />
      <div>
        <h2 id="match-next-title">You both accepted</h2>
        {body}
      </div>
    </section>
  )
}
