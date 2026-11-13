import { useEffect, useState } from 'react'
import { ArrowRight, Clock3, ScrollText } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { EmptyState, ErrorState, LoadingState, showErrorToast } from '../../components/feedback'
import { toApiError } from '../../lib/api/errors'
import { useActiveBusiness } from '../../lib/businesses/useActiveBusiness'
import { MatchBusinessHeader } from '../matching/MatchCard'
import { AGREEMENT_STATUS_LABELS, agreementTiming, isDraftTerms } from './agreementCopy'
import { AGREEMENT_TABS, listAgreementTab, readAgreementTab, type AgreementSummary, type AgreementTab } from './agreementsApi'
import { DraftTermsBanner } from './DraftTermsBanner'
import '../matching/MatchInbox.css'
import '../proposals/Proposals.css'
import './Agreements.css'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; error: unknown }
  | { kind: 'ready'; items: AgreementSummary[]; nextCursor: string | null; loadingMore: boolean }

const EMPTY: Record<AgreementTab, { title: string; description: string }> = {
  open: {
    title: 'No agreements to sign',
    description: 'When you and another business accept the same proposal version, BFB prepares the agreement and it shows here until both sign.',
  },
  signed: {
    title: 'No signed agreements yet',
    description: 'Agreements both businesses signed move here.',
  },
  closed: {
    title: 'No closed agreements',
    description: 'Agreements that expired before both businesses signed, or that BFB cancelled, move here.',
  },
}

/** `/agreements`: the active business's Exchange Agreements by tab, each with its status and deadline. */
export function AgreementsPage() {
  const business = useActiveBusiness()
  const [params, setParams] = useSearchParams()
  const tab = readAgreementTab(params.get('tab'))
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let live = true
    setState({ kind: 'loading' })
    listAgreementTab(business.id, tab)
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
      const page = await listAgreementTab(business.id, tab, state.nextCursor)
      setState((current) =>
        current.kind === 'ready'
          ? { kind: 'ready', items: [...current.items, ...page.items.filter((item) => !current.items.some((seen) => seen.id === item.id))], nextCursor: page.nextCursor, loadingMore: false }
          : current,
      )
    } catch (error) {
      setState((current) => (current.kind === 'ready' ? { ...current, loadingMore: false } : current))
      showErrorToast(`We couldn’t load more agreements. ${toApiError(error).userMessage}`)
    }
  }

  const chooseTab = (next: AgreementTab) => setParams(next === 'open' ? {} : { tab: next }, { replace: true })
  const tabLabel = AGREEMENT_TABS.find(({ id }) => id === tab)?.label
  const anyDraft = state.kind === 'ready' && state.items.some(isDraftTerms)

  return (
    <>
      <div className="page-heading">
        <div>
          <span>AGREEMENTS</span>
          <h1>Put the exchange in writing.</h1>
          <p>When both businesses accept a proposal, BFB turns it into an Exchange Agreement for both to sign.</p>
        </div>
      </div>
      <div className="match-tabs proposal-tabs" role="tablist" aria-label="Agreements">
        {AGREEMENT_TABS.map(({ id, label }) => (
          <button key={id} type="button" role="tab" id={`agreement-tab-${id}`} aria-selected={tab === id} aria-controls="agreement-tab-panel" onClick={() => chooseTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <div id="agreement-tab-panel" role="tabpanel" aria-labelledby={`agreement-tab-${tab}`}>
        {anyDraft && <DraftTermsBanner />}
        {state.kind === 'loading' && <LoadingState label="Loading agreements…" />}
        {state.kind === 'error' && <ErrorState title="We couldn’t load your agreements" error={state.error} onRetry={() => setReloadKey((key) => key + 1)} />}
        {state.kind === 'ready' && state.items.length === 0 && (
          <EmptyState
            icon={ScrollText}
            title={EMPTY[tab].title}
            description={EMPTY[tab].description}
            action={tab === 'open' ? <Link className="button button-secondary button-small" to={paths.proposals}>See your proposals</Link> : undefined}
          />
        )}
        {state.kind === 'ready' && state.items.length > 0 && (
          <>
            <ul className="proposal-list" aria-label={`${tabLabel} agreements`}>
              {state.items.map((item) => <AgreementRow key={item.id} agreement={item} />)}
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

/** One agreement: the other business, the status in words, draft terms, and when it must be signed. */
function AgreementRow({ agreement }: { agreement: AgreementSummary }) {
  const name = agreement.other_business.display_name
  const timing = agreementTiming(agreement)
  return (
    <li className={`proposal-row agreement-row-${agreement.status}`}>
      <div className="proposal-row-business">
        <MatchBusinessHeader business={agreement.other_business} />
      </div>
      <div className="proposal-row-body">
        <p className="proposal-row-summary">Business Exchange Agreement with {name}</p>
        <div className="proposal-row-facts">
          <span className={`match-pill agreement-pill-${agreement.status}`}>{AGREEMENT_STATUS_LABELS[agreement.status]}</span>
          {isDraftTerms(agreement) && <span className="match-pill agreement-pill-draft">Draft terms</span>}
          <Link to={paths.proposal(agreement.proposal_id)}>From the proposal</Link>
        </div>
      </div>
      <div className="proposal-row-foot">
        <span className={`match-timing match-timing-${timing.tone}`}><Clock3 size={14} aria-hidden="true" /> {timing.text}</span>
        <Link className="button button-secondary button-small" to={paths.agreement(agreement.id)} aria-label={`Open agreement with ${name}`}>
          Open <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </li>
  )
}
