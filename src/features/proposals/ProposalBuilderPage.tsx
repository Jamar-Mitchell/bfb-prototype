import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Lock, Send, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { ErrorState, LoadingState, showErrorToast, showToast } from '../../components/feedback'
import { toApiError, type ApiError } from '../../lib/api/errors'
import { updateBusinessRole } from '../../lib/businesses/activeBusiness'
import { useActiveBusiness } from '../../lib/businesses/useActiveBusiness'
import type { SessionBusiness } from '../../stores/session'
import { canAnswerMatches } from '../matching/matchResponses'
import { ConfirmDialog } from '../team/ConfirmDialog'
import { goTo, MissingChecklist, SaveIndicator, SendProposalDialog, ValueComparisonPanel } from './BuilderPanels'
import { CashSection, MilestonesSection, ServicesSection, SummarySection, TermsSection } from './BuilderSections'
import { sectionAnchor } from './proposalCopy'
import { cashForDifference, compareValues, normalizeTerms, type DraftTerms } from './proposalDraft'
import { discardDraft, getProposal, listOtherActiveOffers, listOwnActiveOffers, sendDraft, type OfferChoice, type Proposal, type ProposalDraft, type Side } from './proposalsApi'
import { useDraftAutosave } from './useDraftAutosave'
import { refreshWaitingProposals } from './waitingProposals'
import '../matching/MatchInbox.css'
import '../listings/ListingsPage.css'
import '../team/TeamPage.css'
import './Proposals.css'
import './ProposalBuilder.css'

/** Why the builder reloaded the proposal, in words. */
function refusalNotice(error: ApiError): string {
  switch (error.code) {
    case 'stale_draft':
      return 'This draft was saved somewhere else (another window or a teammate) since you opened it. We loaded the latest version; your changes from the last few seconds were not saved.'
    case 'business_role_required':
      return 'Only owners and administrators can edit proposals. Your role may have changed.'
    case 'proposal_incomplete':
      return 'A few things are still missing. They are listed under “Before you send”.'
    default:
      return 'This proposal changed since you opened it, so we loaded it again.'
  }
}

/** `/proposals/:id/edit`: this business's draft, in sections, saved as you go. */
export function ProposalBuilderPage() {
  const { proposalId = '' } = useParams()
  const business = useActiveBusiness()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [loads, setLoads] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)

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
  }, [business.id, proposalId, loads])

  /** Load the proposal again and start the builder over from it, saying why. */
  const reload = useCallback((message: string) => {
    setNotice(message)
    setProposal(null)
    setLoads((count) => count + 1)
  }, [])

  const back = <Link className="back-button match-back" to={paths.proposal(proposalId)}><ArrowLeft size={17} aria-hidden="true" /> Back to the proposal</Link>

  if (!proposal) {
    const notFound = loadError !== null && toApiError(loadError).code === 'not_found'
    return (
      <>
        {back}
        {loadError ? (
          <ErrorState title={notFound ? 'This proposal doesn’t exist' : 'We couldn’t load this proposal'} error={loadError} onRetry={notFound ? undefined : () => setLoads((count) => count + 1)} />
        ) : (
          <LoadingState label="Loading the draft…" />
        )}
      </>
    )
  }

  const draft = proposal.draft
  if (!draft || !canAnswerMatches(business.role)) {
    return (
      <>
        {back}
        {notice && <p className="match-notice match-notice-error" role="alert">{notice}</p>}
        <section className="match-panel proposal-overview">
          <h1 className="proposal-builder-closed">{draft ? 'Only owners and administrators can edit this draft' : 'There is no draft to edit'}</h1>
          <p>
            {draft
              ? <><Lock size={14} aria-hidden="true" /> You can see where the proposal stands; owners and administrators of {business.name} write and send it.</>
              : 'This proposal has no draft from your business. It may have been sent or discarded.'}
          </p>
          <div className="proposal-overview-actions">
            <Link className="button button-secondary button-small" to={paths.proposal(proposal.id)}>Open the proposal</Link>
          </div>
        </section>
      </>
    )
  }

  return <Builder key={`${proposal.id}-${loads}`} business={business} proposal={proposal} draft={draft} back={back} notice={notice} onNotice={setNotice} onReload={reload} />
}

function Builder({ business, proposal, draft, back, notice, onNotice, onReload }: {
  business: SessionBusiness
  proposal: Proposal
  draft: ProposalDraft
  back: React.ReactNode
  notice: string | null
  onNotice: (message: string | null) => void
  onReload: (message: string) => void
}) {
  const navigate = useNavigate()
  const mySide = proposal.me.side
  const otherName = proposal.other.business.display_name
  const names = { [mySide]: proposal.me.business.display_name, [proposal.other.side]: otherName } as Record<Side, string>
  const [terms, setTerms] = useState<DraftTerms>(() => normalizeTerms(draft.terms))
  const termsRef = useRef(terms)
  const [missing, setMissing] = useState<string[]>(draft.missing)
  const [offers, setOffers] = useState<Record<Side, OfferChoice[] | null>>({ a: null, b: null })
  const [sending, setSending] = useState<'closed' | 'open' | 'busy'>('closed')
  const [sendError, setSendError] = useState<string | null>(null)
  const [discarding, setDiscarding] = useState<'closed' | 'open' | 'busy'>('closed')

  const refused = (error: ApiError) => {
    if (error.code === 'business_role_required') updateBusinessRole(business.id, 'member')
    onReload(refusalNotice(error))
  }

  const autosave = useDraftAutosave({
    businessId: business.id,
    proposalId: proposal.id,
    revision: draft.revision,
    onSaved: (saved) => {
      if (saved.draft) setMissing(saved.draft.missing)
    },
    onRefused: refused,
  })

  // Active offers each business could add as a service. Not knowing is fine: "Write a service" still works.
  useEffect(() => {
    let live = true
    const load = (side: Side, request: Promise<OfferChoice[]>) =>
      request
        .then((list) => {
          if (live) setOffers((current) => ({ ...current, [side]: list }))
        })
        .catch(() => undefined)
    void load(mySide, listOwnActiveOffers(business.id))
    void load(proposal.other.side, listOtherActiveOffers(business.id, proposal.other.business.id))
    return () => {
      live = false
    }
  }, [business.id, mySide, proposal.other.side, proposal.other.business.id])

  /** Every edit: change the whole document, show it, and save it once edits pause. */
  const update = (change: (current: DraftTerms) => DraftTerms) => {
    const next = change(termsRef.current)
    termsRef.current = next
    setTerms(next)
    autosave.schedule(next)
  }

  const addCash = () => {
    update((current) => ({ ...current, cash_adjustment: cashForDifference(compareValues(current)) }))
    requestAnimationFrame(() => goTo(sectionAnchor('cash')))
  }

  const openSend = async () => {
    onNotice(null)
    setSendError(null)
    if (!(await autosave.flush())) {
      showErrorToast('Your latest changes couldn’t be saved, so the proposal can’t be sent yet. Try again in a moment.')
      return
    }
    setSending('open')
  }

  const send = async (expiresInDays: number) => {
    setSending('busy')
    try {
      if (!(await autosave.flush())) throw new Error('unsaved')
      await sendDraft(business.id, proposal.id, expiresInDays)
      autosave.stop()
      showToast(`Version ${draft.version_number} sent to ${otherName}.`)
      void refreshWaitingProposals(business.id)
      navigate(paths.proposal(proposal.id))
    } catch (caught) {
      const error = toApiError(caught)
      if (error.code === 'proposal_incomplete') {
        const details = error.details as { missing?: unknown } | undefined
        if (Array.isArray(details?.missing)) setMissing(details.missing.filter((key): key is string => typeof key === 'string'))
        setSending('closed')
        onNotice(refusalNotice(error))
        requestAnimationFrame(() => document.getElementById('proposal-missing-title')?.scrollIntoView?.({ block: 'center' }))
      } else if (error.code === 'invalid_proposal_status' || error.code === 'business_role_required' || error.code === 'stale_draft') {
        refused(error)
      } else {
        setSendError(error.code === 'unknown_error' ? 'Your latest changes couldn’t be saved, so nothing was sent. Try again.' : `We couldn’t send the proposal. ${error.userMessage}`)
        setSending('open')
      }
    }
  }

  const discard = async () => {
    setDiscarding('busy')
    autosave.stop()
    try {
      await discardDraft(business.id, proposal.id)
      void refreshWaitingProposals(business.id)
      if (proposal.current_version) {
        showToast('Draft discarded.')
        navigate(paths.proposal(proposal.id))
      } else {
        showToast('Draft discarded. The proposal was withdrawn, and the match is free for a new one.')
        navigate(paths.match(proposal.match_id))
      }
    } catch (caught) {
      const error = toApiError(caught)
      setDiscarding('closed')
      if (error.code === 'invalid_proposal_status' || error.code === 'business_role_required') {
        refused(error)
      } else {
        autosave.retry()
        showErrorToast(`We couldn’t discard the draft. ${error.userMessage}`)
      }
    }
  }

  const sectionProps = { terms, update, names, mySide }

  return (
    <>
      {back}
      <div className="page-heading match-heading proposal-heading">
        <div>
          <span>PROPOSAL · VERSION {draft.version_number} DRAFT</span>
          <h1>Proposal to {otherName}</h1>
          <p>Only {business.name} can see this draft until you send it. Changes save as you go.</p>
        </div>
      </div>
      {notice && <p className="match-notice match-notice-error" role="alert">{notice}</p>}
      <div className="match-layout proposal-builder-layout">
        <div className="match-main">
          <SummarySection {...sectionProps} />
          <ServicesSection {...sectionProps} offers={offers} />
          <MilestonesSection {...sectionProps} />
          <TermsSection {...sectionProps} />
          <CashSection {...sectionProps} />
        </div>
        <aside className="match-side proposal-builder-side">
          <ValueComparisonPanel terms={terms} names={names} mySide={mySide} onAddCash={addCash} />
          <MissingChecklist missing={missing} terms={terms} names={names} stale={autosave.status !== 'saved'} />
        </aside>
      </div>
      <div className="proposal-savebar">
        <SaveIndicator status={autosave.status} onRetry={autosave.retry} />
        <div>
          <button type="button" className="button button-secondary button-small" onClick={() => setDiscarding('open')}>
            <Trash2 size={15} aria-hidden="true" /> Discard draft
          </button>
          <button type="button" className="button button-primary button-small" onClick={() => void openSend()} disabled={missing.length > 0 && autosave.status === 'saved'}>
            <Send size={15} aria-hidden="true" /> Send proposal
          </button>
        </div>
      </div>
      {sending !== 'closed' && (
        <SendProposalDialog
          versionNumber={draft.version_number}
          otherName={otherName}
          busy={sending === 'busy'}
          error={sendError}
          onSend={(days) => void send(days)}
          onCancel={() => setSending('closed')}
        />
      )}
      {discarding !== 'closed' && (
        <ConfirmDialog
          kicker="DISCARD DRAFT"
          title="Discard this draft?"
          confirmLabel="Discard draft"
          busyLabel="Discarding…"
          busy={discarding === 'busy'}
          onConfirm={() => void discard()}
          onCancel={() => setDiscarding('closed')}
        >
          <p>
            {proposal.current_version
              ? `Your changes are deleted. Version ${proposal.current_version.version_number} stays as it is.`
              : `Everything in this draft is deleted and the proposal is withdrawn. ${otherName} will see it as withdrawn, and you can start a new one from the match.`}
          </p>
        </ConfirmDialog>
      )}
    </>
  )
}
