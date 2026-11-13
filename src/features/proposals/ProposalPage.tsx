import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Check, FilePen, Lock, Repeat2, Undo2, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { ErrorState, LoadingState, showErrorToast, showToast } from '../../components/feedback'
import { toApiError, type ApiError } from '../../lib/api/errors'
import { updateBusinessRole } from '../../lib/businesses/activeBusiness'
import { useActiveBusiness } from '../../lib/businesses/useActiveBusiness'
import type { SessionBusiness } from '../../stores/session'
import { PublicProfileLink } from '../businesses/PublicProfileLink'
import { MatchBusinessHeader } from '../matching/MatchCard'
import { canAnswerMatches } from '../matching/matchResponses'
import { formatMatchDate } from '../matching/matchInboxDisplay'
import { partyDetailsMissingFrom } from '../businesses/partyDetails'
import { AcceptProposalDialog } from './AcceptProposalDialog'
import { CloseProposalDialog } from './CloseProposalDialog'
import { PartyDetailsPrompt } from './PartyDetailsPrompt'
import { ProposalDocument } from './ProposalDocument'
import {
  PROPOSAL_DECLINE_REASON_LABELS,
  PROPOSAL_WITHDRAW_REASON_LABELS,
  proposalStandingText,
  proposalStatusLabel,
  versionLabel,
  waitingOnText,
} from './proposalCopy'
import {
  acceptVersion,
  counterProposal,
  declineProposal,
  getProposal,
  isOpen,
  withdrawProposal,
  type CloseBody,
  type Proposal,
  type ProposalDeclineReason,
  type ProposalWithdrawReason,
  type Side,
} from './proposalsApi'
import { VersionTimeline } from './VersionTimeline'
import { refreshWaitingProposals } from './waitingProposals'
import '../matching/MatchInbox.css'
import '../team/TeamPage.css'
import './Proposals.css'
import './ProposalReview.css'

function detailString(error: ApiError, key: string): string | null {
  const details = error.details
  if (typeof details !== 'object' || details === null) return null
  const value = (details as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : null
}

/** Why the page loaded the proposal again after an action was refused, in words. */
export function proposalConflictText(error: ApiError): string {
  if (error.code === 'business_role_required') return 'Only owners and administrators can answer proposals. Your role may have changed.'
  switch (detailString(error, 'reason')) {
    case 'closed':
      return 'This proposal closed since you opened it, so we loaded it again.'
    case 'not_your_turn':
      return 'This proposal changed since you opened it and it’s no longer your turn, so we loaded it again.'
    case 'not_current_version':
      return 'A newer version replaced the one you were accepting, so we loaded the current one. Read it before you answer.'
    case 'already_accepted':
      return 'Your business has already accepted this version, so we loaded it again.'
    default:
      return 'This proposal changed since you opened it, so we loaded it again.'
  }
}

/** A refusal the page answers by loading the proposal again. */
function isConflict(error: ApiError): boolean {
  return error.code === 'invalid_proposal_status' || error.code === 'business_role_required' || error.code === 'not_found'
}

/**
 * `/proposals/:id`: the current version as a readable document, where the proposal stands,
 * and what this business can do next: counter or decline for the business that did not send
 * it, withdraw for the sender. Members read only.
 */
export function ProposalPage() {
  const { proposalId = '' } = useParams()
  // A fresh page per proposal: no dialog, notice or old proposal carried over.
  return <ProposalView key={proposalId} proposalId={proposalId} />
}

function ProposalView({ proposalId }: { proposalId: string }) {
  const business = useActiveBusiness()
  const navigate = useNavigate()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'accept' | 'decline' | 'withdraw' | null>(null)
  const [countering, setCountering] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [acceptMissing, setAcceptMissing] = useState<string[] | null>(null)
  const [acceptError, setAcceptError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setLoadError(null)
    getProposal(business.id, proposalId)
      .then((result) => {
        if (live) setProposal(result)
      })
      .catch((error: unknown) => {
        if (live) setLoadError(toApiError(error))
      })
    return () => {
      live = false
    }
  }, [business.id, proposalId, reloadKey])

  /** Load the proposal again, saying why. */
  const refresh = useCallback((error: ApiError) => {
    if (error.code === 'business_role_required') updateBusinessRole(business.id, 'member')
    setDialog(null)
    setNotice(proposalConflictText(error))
    setReloadKey((key) => key + 1)
    void refreshWaitingProposals(business.id)
  }, [business.id])

  const back = <Link className="back-button match-back" to={paths.proposals}><ArrowLeft size={17} aria-hidden="true" /> Back to proposals</Link>

  if (!proposal) {
    const notFound = loadError !== null && toApiError(loadError).code === 'not_found'
    return (
      <>
        {back}
        {loadError ? (
          <ErrorState title={notFound ? 'This proposal doesn’t exist' : 'We couldn’t load this proposal'} error={loadError} onRetry={notFound ? undefined : () => setReloadKey((key) => key + 1)} />
        ) : (
          <LoadingState label="Loading proposal…" />
        )}
      </>
    )
  }

  const other = proposal.other.business
  const names = { [proposal.me.side]: proposal.me.business.display_name, [proposal.other.side]: other.display_name } as Record<Side, string>
  const current = proposal.current_version
  const waitingOn = waitingOnText(proposal, other.display_name)

  const counter = async () => {
    setCountering(true)
    try {
      await counterProposal(business.id, proposal.id)
      navigate(paths.proposalEdit(proposal.id))
    } catch (caught) {
      const error = toApiError(caught)
      setCountering(false)
      if (error.code === 'invalid_proposal_status' && detailString(error, 'reason') === 'draft_exists') {
        navigate(paths.proposalEdit(proposal.id))
      } else if (isConflict(error)) {
        refresh(error)
      } else {
        showErrorToast(`We couldn’t start a counteroffer. ${error.userMessage}`)
      }
    }
  }

  const openAccept = () => {
    setAcceptMissing(null)
    setAcceptError(null)
    setDialog('accept')
  }

  const accept = async () => {
    if (!current) return
    setAccepting(true)
    setAcceptMissing(null)
    setAcceptError(null)
    try {
      const updated = await acceptVersion(business.id, proposal.id, current.version_number)
      setDialog(null)
      setNotice(null)
      setProposal(updated)
      showToast(updated.status === 'accepted' ? `You and ${other.display_name} accepted version ${current.version_number}.` : `Version ${current.version_number} accepted.`)
      void refreshWaitingProposals(business.id)
    } catch (caught) {
      const error = toApiError(caught)
      if (error.code === 'party_details_missing') setAcceptMissing(partyDetailsMissingFrom(error.details))
      else if (isConflict(error)) refresh(error)
      else setAcceptError(`We couldn’t accept the proposal. ${error.userMessage}`)
    } finally {
      setAccepting(false)
    }
  }

  /** Declines or withdraws. A refusal reloads the page; anything else stays in the dialog. */
  const close = async (send: () => Promise<Proposal>, done: string) => {
    try {
      const updated = await send()
      setDialog(null)
      setNotice(null)
      setProposal(updated)
      showToast(done)
      void refreshWaitingProposals(business.id)
    } catch (caught) {
      const error = toApiError(caught)
      if (isConflict(error)) refresh(error)
      else throw caught
    }
  }

  return (
    <>
      {back}
      <div className="page-heading match-heading proposal-heading">
        <div>
          <span>PROPOSAL{current ? ` · VERSION ${current.version_number}` : ''}</span>
          <h1>{other.display_name}</h1>
          <p>Started {formatMatchDate(proposal.created_at)} from <Link to={paths.match(proposal.match_id)}>your match</Link>.</p>
        </div>
        <div>
          <div className="match-card-pills">
            <span className={`match-pill proposal-pill-${proposal.status}`}>{proposalStatusLabel(proposal)}</span>
          </div>
        </div>
      </div>
      {notice && <p className="match-notice match-notice-error" role="alert">{notice}</p>}
      <div className="match-layout proposal-review-layout">
        <div className="match-main">
          <section className={`match-panel proposal-standing proposal-standing-${proposal.status}`} aria-labelledby="proposal-standing-title">
            <h2 id="proposal-standing-title" className="match-side-title">{proposal.status === 'accepted' ? 'Accepted' : 'Where it stands'}</h2>
            <p>{proposalStandingText(proposal)}</p>
            {proposal.status === 'accepted' && (
              <p className="proposal-next">This version is final. Next, BFB prepares the Business Exchange Agreement from it for both businesses to sign; agreements and signatures arrive in the next release.</p>
            )}
          </section>
          {current && <ProposalDocument version={current} names={names} mySide={proposal.me.side} />}
          <VersionTimeline proposal={proposal} businessId={business.id} />
        </div>
        <aside className="match-side">
          <ActionsPanel
            proposal={proposal}
            business={business}
            countering={countering}
            onAccept={openAccept}
            onCounter={() => void counter()}
            onDecline={() => setDialog('decline')}
            onWithdraw={() => setDialog('withdraw')}
          />
          <section className="match-panel match-panel-body" aria-labelledby="proposal-status-title">
            <h2 id="proposal-status-title" className="match-side-title">Status</h2>
            <dl className="match-status-facts">
              <div><dt>Status</dt><dd>{proposalStatusLabel(proposal)}</dd></div>
              <div><dt>Version</dt><dd>{versionLabel(current?.version_number ?? null)}</dd></div>
              {waitingOn && <div><dt>Whose turn</dt><dd>{waitingOn}</dd></div>}
              {isOpen(proposal.status) && proposal.expires_at && <div><dt>Respond by</dt><dd>{formatMatchDate(proposal.expires_at)}</dd></div>}
              {proposal.closed_at && <div><dt>{proposal.status === 'expired' ? 'Expired' : 'Closed'}</dt><dd>{formatMatchDate(proposal.closed_at)}</dd></div>}
            </dl>
          </section>
          <section className="match-panel match-panel-body" aria-labelledby="proposal-other-title">
            <h2 id="proposal-other-title" className="match-side-title">The other business</h2>
            <MatchBusinessHeader business={other} as="h3" />
            <PublicProfileLink businessId={other.id} profileStatus={other.profile_status} />
          </section>
        </aside>
      </div>
      {dialog === 'accept' && current && (
        <AcceptProposalDialog
          proposal={proposal}
          version={current}
          busy={accepting}
          error={
            acceptMissing ? <PartyDetailsPrompt action="accept" missing={acceptMissing} />
              : acceptError ? <p className="match-notice match-notice-error" role="alert">{acceptError}</p>
                : null
          }
          onAccept={() => void accept()}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'decline' && current && (
        <CloseProposalDialog
          copy={{
            kicker: 'DECLINE PROPOSAL',
            title: `Decline version ${current.version_number}?`,
            intro: `The proposal closes for both businesses${proposal.draft ? ' and your counteroffer draft is deleted' : ''}. ${other.display_name} will see that you declined, but not why. You can start a new proposal from the match later.`,
            legend: 'Why are you declining?',
            confirm: 'Decline proposal',
            busy: 'Declining…',
          }}
          reasons={PROPOSAL_DECLINE_REASON_LABELS}
          otherName={other.display_name}
          onSubmit={(body: CloseBody<ProposalDeclineReason>) => close(() => declineProposal(business.id, proposal.id, body), 'Proposal declined.')}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'withdraw' && current && (
        <CloseProposalDialog
          copy={{
            kicker: 'WITHDRAW PROPOSAL',
            title: `Withdraw version ${current.version_number}?`,
            intro: `${other.display_name} can no longer accept or counter it, and the proposal closes for both businesses. They will see that you withdrew it, but not why. You can start a new proposal from the match later.`,
            legend: 'Why are you withdrawing?',
            confirm: 'Withdraw proposal',
            busy: 'Withdrawing…',
          }}
          reasons={PROPOSAL_WITHDRAW_REASON_LABELS}
          otherName={other.display_name}
          onSubmit={(body: CloseBody<ProposalWithdrawReason>) => close(() => withdrawProposal(business.id, proposal.id, body), 'Proposal withdrawn.')}
          onCancel={() => setDialog(null)}
        />
      )}
    </>
  )
}

/**
 * What this business can do next. The business that did not send the current version counters
 * or declines; the sender withdraws; the business writing version 1 keeps editing. Members see
 * who can act instead. Closed proposals offer nothing.
 */
function ActionsPanel({ proposal, business, countering, onAccept, onCounter, onDecline, onWithdraw }: {
  proposal: Proposal
  business: SessionBusiness
  countering: boolean
  onAccept: () => void
  onCounter: () => void
  onDecline: () => void
  onWithdraw: () => void
}) {
  if (!isOpen(proposal.status)) return null
  const current = proposal.current_version
  const otherName = proposal.other.business.display_name
  const canAct = canAnswerMatches(business.role)
  const lock = (what: string) => (
    <p className="match-answer-who"><Lock size={13} aria-hidden="true" /> Only owners and administrators of {business.name} can {what}.</p>
  )

  let title: string
  let body: React.ReactNode
  if (!current) {
    if (proposal.waiting_on !== 'us') return null
    title = 'Your draft'
    body = canAct ? (
      <div className="match-answer-actions">
        <Link className="button button-primary" to={paths.proposalEdit(proposal.id)}><FilePen size={16} aria-hidden="true" /> Continue editing</Link>
      </div>
    ) : lock('edit and send it')
  } else if (current.author_side === proposal.me.side) {
    title = 'Your proposal'
    body = (
      <>
        <p>Waiting on {otherName} to accept, decline or send a counteroffer.</p>
        {canAct ? (
          <div className="match-answer-actions">
            <button type="button" className="button button-secondary" onClick={onWithdraw}><Undo2 size={16} aria-hidden="true" /> Withdraw</button>
          </div>
        ) : lock('withdraw it')}
      </>
    )
  } else {
    title = 'Your answer'
    const counterDraft = proposal.draft
    body = canAct ? (
      <>
        {counterDraft
          ? <p>You’re writing version {counterDraft.version_number}, a counteroffer. {otherName} still sees version {current.version_number} until you send it.</p>
          : <p>Accept version {current.version_number} as it is, send a counteroffer to change anything, or decline to close the proposal.</p>}
        <div className="match-answer-actions">
          <button type="button" className="button button-primary" onClick={onAccept} disabled={countering}><Check size={16} aria-hidden="true" /> Accept</button>
          {counterDraft ? (
            <Link className="button button-secondary" to={paths.proposalEdit(proposal.id)}><FilePen size={16} aria-hidden="true" /> Continue your counteroffer</Link>
          ) : (
            <button type="button" className="button button-secondary" onClick={onCounter} disabled={countering}>
              <Repeat2 size={16} aria-hidden="true" /> {countering ? 'Starting…' : 'Counter'}
            </button>
          )}
          <button type="button" className="button button-secondary" onClick={onDecline} disabled={countering}><X size={16} aria-hidden="true" /> Decline</button>
        </div>
      </>
    ) : (
      <>
        <p>Waiting on {business.name} to answer.</p>
        {lock('accept, counter or decline')}
      </>
    )
  }

  return (
    <section className="match-panel match-panel-body match-answer" aria-labelledby="proposal-actions-title">
      <h2 id="proposal-actions-title" className="match-side-title">{title}</h2>
      {body}
    </section>
  )
}
