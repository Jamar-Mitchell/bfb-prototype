import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { ErrorState, LoadingState } from '../../components/feedback'
import { toApiError } from '../../lib/api/errors'
import { useActiveBusiness } from '../../lib/businesses/useActiveBusiness'
import { PublicProfileLink } from '../businesses/PublicProfileLink'
import { MatchBusinessHeader } from '../matching/MatchCard'
import { formatMatchDate } from '../matching/matchInboxDisplay'
import { proposalStatusLabel, versionLabel, waitingOnText } from './proposalCopy'
import { getProposal, isOpen, type Proposal } from './proposalsApi'
import '../matching/MatchInbox.css'
import './Proposals.css'

/**
 * `/proposals/:id`: where a proposal stands. The full review of the terms (FE-4.3) replaces
 * the overview panel; the status card stays.
 */
export function ProposalPage() {
  const { proposalId = '' } = useParams()
  const business = useActiveBusiness()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)

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
  const summary = proposal.current_version?.terms.summary ?? proposal.draft?.terms.summary ?? null
  const versionNumber = proposal.current_version?.version_number ?? null
  const waitingOn = waitingOnText(proposal, other.display_name)

  return (
    <>
      {back}
      <div className="page-heading match-heading proposal-heading">
        <div>
          <span>PROPOSAL</span>
          <h1>{other.display_name}</h1>
          <p>Started {formatMatchDate(proposal.created_at)} from <Link to={paths.match(proposal.match_id)}>your match</Link>.</p>
        </div>
        <div>
          <div className="match-card-pills">
            <span className={`match-pill proposal-pill-${proposal.status}`}>{proposalStatusLabel(proposal)}</span>
          </div>
        </div>
      </div>
      <div className="match-layout">
        <div className="match-main">
          <section className="match-panel proposal-overview" aria-labelledby="proposal-overview-title">
            <h2 id="proposal-overview-title">{summary ?? 'No summary yet'}</h2>
            <OverviewText proposal={proposal} />
          </section>
        </div>
        <aside className="match-side">
          <section className="match-panel match-panel-body" aria-labelledby="proposal-status-title">
            <h2 id="proposal-status-title" className="match-side-title">Status</h2>
            <dl className="match-status-facts">
              <div><dt>Status</dt><dd>{proposalStatusLabel(proposal)}</dd></div>
              <div><dt>Version</dt><dd>{versionLabel(versionNumber)}</dd></div>
              {waitingOn && <div><dt>Whose turn</dt><dd>{waitingOn}</dd></div>}
              {isOpen(proposal.status) && proposal.expires_at && <div><dt>Respond by</dt><dd>{formatMatchDate(proposal.expires_at)}</dd></div>}
              {proposal.closed_at && <div><dt>Closed</dt><dd>{formatMatchDate(proposal.closed_at)}</dd></div>}
            </dl>
          </section>
          <section className="match-panel match-panel-body" aria-labelledby="proposal-other-title">
            <h2 id="proposal-other-title" className="match-side-title">The other business</h2>
            <MatchBusinessHeader business={other} as="h3" />
            <PublicProfileLink businessId={other.id} profileStatus={other.profile_status} />
          </section>
        </aside>
      </div>
    </>
  )
}

function OverviewText({ proposal }: { proposal: Proposal }) {
  const otherName = proposal.other.business.display_name
  if (proposal.draft) {
    return <p>Your business is writing version {proposal.draft.version_number}. {otherName} sees it once you send it.</p>
  }
  if (proposal.status === 'draft') {
    return <p>{otherName} is writing the first version. You’ll see the terms here once they send it.</p>
  }
  return <p>The full terms of this version will show here in the next release.</p>
}
