import { useEffect, useState } from 'react'
import { ArrowRight, Clock3, FileSignature } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { EmptyState, ErrorState, LoadingState, showErrorToast } from '../../components/feedback'
import { toApiError } from '../../lib/api/errors'
import { useActiveBusiness } from '../../lib/businesses/useActiveBusiness'
import { MatchBusinessHeader } from '../matching/MatchCard'
import { canAnswerMatches } from '../matching/matchResponses'
import { proposalStatusLabel, proposalTiming, versionLabel, waitingOnText } from './proposalCopy'
import { listProposalTab, PROPOSAL_TABS, readProposalTab, type ProposalSummary, type ProposalTab } from './proposalsApi'
import { useWaitingProposals } from './waitingProposals'
import '../matching/MatchInbox.css'
import './Proposals.css'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; error: unknown }
  | { kind: 'ready'; items: ProposalSummary[]; nextCursor: string | null; loadingMore: boolean }

const EMPTY: Record<ProposalTab, { title: string; description: string }> = {
  us: {
    title: 'Nothing waiting on you',
    description: 'When another business sends you a proposal or a counteroffer, it shows here until you answer.',
  },
  them: {
    title: 'Nothing waiting on other businesses',
    description: 'Proposals you send show here while the other business decides.',
  },
  drafts: {
    title: 'No drafts',
    description: 'Start a proposal from a match you and the other business both accepted.',
  },
  accepted: {
    title: 'No accepted proposals yet',
    description: 'Proposals both businesses accept move here, each with the agreement BFB prepares from it.',
  },
  closed: {
    title: 'No closed proposals',
    description: 'Declined, withdrawn and expired proposals move here.',
  },
}

/** `/proposals`: the active business's proposals by tab, each with whose turn it is and when. */
export function ProposalsPage() {
  const business = useActiveBusiness()
  const [params, setParams] = useSearchParams()
  const tab = readProposalTab(params.get('tab'))
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const waiting = useWaitingProposals(business.id)

  useEffect(() => {
    let live = true
    setState({ kind: 'loading' })
    listProposalTab(business.id, tab)
      .then((page) => {
        if (live) setState({ kind: 'ready', items: page.items, nextCursor: page.nextCursor, loadingMore: false })
      })
      .catch((error: unknown) => {
        if (live) setState({ kind: 'error', error })
      })
    return () => {
      live = false
    }
  }, [business.id, tab, reloadKey])

  const loadMore = async () => {
    if (state.kind !== 'ready' || !state.nextCursor) return
    setState({ ...state, loadingMore: true })
    try {
      const page = await listProposalTab(business.id, tab, state.nextCursor)
      setState((current) =>
        current.kind === 'ready'
          ? { kind: 'ready', items: [...current.items, ...page.items.filter((item) => !current.items.some((seen) => seen.id === item.id))], nextCursor: page.nextCursor, loadingMore: false }
          : current,
      )
    } catch (error) {
      setState((current) => (current.kind === 'ready' ? { ...current, loadingMore: false } : current))
      showErrorToast(`We couldn’t load more proposals. ${toApiError(error).userMessage}`)
    }
  }

  const chooseTab = (next: ProposalTab) => setParams(next === 'us' ? {} : { tab: next }, { replace: true })
  const tabLabel = PROPOSAL_TABS.find(({ id }) => id === tab)?.label

  return (
    <>
      <div className="page-heading">
        <div>
          <span>PROPOSALS</span>
          <h1>Agree on the exchange, term by term.</h1>
          <p>Each proposal says who provides what, by when and on what terms. Start one from an accepted match.</p>
        </div>
      </div>
      <div className="match-tabs proposal-tabs" role="tablist" aria-label="Proposals">
        {PROPOSAL_TABS.map(({ id, label }) => (
          <button key={id} type="button" role="tab" id={`proposal-tab-${id}`} aria-selected={tab === id} aria-controls="proposal-tab-panel" onClick={() => chooseTab(id)}>
            {label}
            {id === 'us' && waiting ? <span className="match-tab-count" aria-label={`${waiting} waiting on you`}>{waiting}</span> : null}
          </button>
        ))}
      </div>
      <div id="proposal-tab-panel" role="tabpanel" aria-labelledby={`proposal-tab-${tab}`}>
        {state.kind === 'loading' && <LoadingState label="Loading proposals…" />}
        {state.kind === 'error' && <ErrorState title="We couldn’t load your proposals" error={state.error} onRetry={() => setReloadKey((key) => key + 1)} />}
        {state.kind === 'ready' && state.items.length === 0 && (
          <EmptyState
            icon={FileSignature}
            title={EMPTY[tab].title}
            description={EMPTY[tab].description}
            action={tab === 'drafts' || tab === 'us' ? <Link className="button button-secondary button-small" to={`${paths.matches}?tab=accepted`}>See accepted matches</Link> : undefined}
          />
        )}
        {state.kind === 'ready' && state.items.length > 0 && (
          <>
            <ul className="proposal-list" aria-label={`${tabLabel} proposals`}>
              {state.items.map((item) => <ProposalRow key={item.id} proposal={item} canEdit={canAnswerMatches(business.role)} />)}
            </ul>
            {state.nextCursor && (
              <div className="match-more">
                <button type="button" className="button button-secondary" onClick={() => void loadMore()} disabled={state.loadingMore}>
                  {state.loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

/** One proposal: the other business, the summary, the version, the status in words, whose turn and when. */
function ProposalRow({ proposal, canEdit }: { proposal: ProposalSummary; canEdit: boolean }) {
  const name = proposal.other_business.display_name
  const timing = proposalTiming(proposal)
  const waitingOn = waitingOnText(proposal, name)
  // Your own unsent first version opens in the builder.
  const edit = canEdit && proposal.status === 'draft' && proposal.waiting_on === 'us'
  return (
    <li className={`proposal-row proposal-row-${proposal.status}`}>
      <div className="proposal-row-business">
        <MatchBusinessHeader business={proposal.other_business} />
      </div>
      <div className="proposal-row-body">
        <p className={proposal.summary ? 'proposal-row-summary' : 'proposal-row-summary proposal-row-muted'}>
          {proposal.summary ?? (proposal.status === 'draft' && proposal.waiting_on === 'them' ? `${name} is preparing a proposal for you.` : 'No summary yet.')}
        </p>
        <div className="proposal-row-facts">
          <span className={`match-pill proposal-pill-${proposal.status}`}>{proposalStatusLabel(proposal)}</span>
          <span>{versionLabel(proposal.current_version_number)}</span>
          {waitingOn && <span className={proposal.waiting_on === 'us' ? 'proposal-row-turn proposal-row-turn-us' : 'proposal-row-turn'}>{waitingOn}</span>}
        </div>
      </div>
      <div className="proposal-row-foot">
        <span className={`match-timing match-timing-${timing.tone}`}><Clock3 size={14} aria-hidden="true" /> {timing.text}</span>
        <Link className="button button-secondary button-small" to={edit ? paths.proposalEdit(proposal.id) : paths.proposal(proposal.id)} aria-label={`${edit ? 'Edit' : 'Open'} proposal with ${name}`}>
          {edit ? 'Edit' : 'Open'} <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </li>
  )
}
