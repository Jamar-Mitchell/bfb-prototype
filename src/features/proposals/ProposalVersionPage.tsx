import { useEffect, useState } from 'react'
import { ArrowLeft, History } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { ErrorState, LoadingState } from '../../components/feedback'
import { toApiError } from '../../lib/api/errors'
import { useActiveBusiness } from '../../lib/businesses/useActiveBusiness'
import { ProposalDocument } from './ProposalDocument'
import { getProposal, getVersion, type Proposal, type SentVersion, type Side } from './proposalsApi'
import { acceptedByText, VersionChanges } from './VersionTimeline'
import '../matching/MatchInbox.css'
import './Proposals.css'
import './ProposalReview.css'

/**
 * `/proposals/:id/versions/:n`: one sent version, read-only. A replaced version says which
 * version replaced it and links to the current one; nothing can be done with it here.
 */
export function ProposalVersionPage() {
  const { proposalId = '', versionNumber: rawNumber = '' } = useParams()
  const versionNumber = Number(rawNumber)
  const business = useActiveBusiness()
  const [loaded, setLoaded] = useState<{ proposal: Proposal; version: SentVersion } | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    setLoaded(null)
    setLoadError(null)
    Promise.all([getProposal(business.id, proposalId), getVersion(business.id, proposalId, versionNumber)])
      .then(([proposal, version]) => {
        if (live) setLoaded({ proposal, version })
      })
      .catch((error: unknown) => {
        if (live) setLoadError(toApiError(error))
      })
    return () => {
      live = false
    }
  }, [business.id, proposalId, versionNumber, attempt])

  const back = <Link className="back-button match-back" to={paths.proposal(proposalId)}><ArrowLeft size={17} aria-hidden="true" /> Back to the proposal</Link>

  if (!loaded) {
    const notFound = loadError !== null && toApiError(loadError).code === 'not_found'
    return (
      <>
        {back}
        {loadError ? (
          <ErrorState title={notFound ? 'This version doesn’t exist' : 'We couldn’t load this version'} error={loadError} onRetry={notFound ? undefined : () => setAttempt((count) => count + 1)} />
        ) : (
          <LoadingState label="Loading version…" />
        )}
      </>
    )
  }

  const { proposal, version } = loaded
  if (version.is_current) return <Navigate to={paths.proposal(proposal.id)} replace />

  const names = { [proposal.me.side]: proposal.me.business.display_name, [proposal.other.side]: proposal.other.business.display_name } as Record<Side, string>
  const replacedBy = proposal.versions.find((item) => item.version_number > version.version_number)?.version_number ?? null
  const current = proposal.current_version?.version_number ?? null

  return (
    <>
      {back}
      <div className="page-heading match-heading proposal-heading">
        <div>
          <span>PROPOSAL · VERSION {version.version_number}</span>
          <h1>{proposal.other.business.display_name}</h1>
          <p>An earlier version, kept as it was sent.</p>
        </div>
        <div>
          <div className="match-card-pills"><span className="match-pill">Replaced</span></div>
        </div>
      </div>
      <div className="proposal-version-page">
        <section className="match-panel proposal-standing proposal-replaced" aria-labelledby="proposal-replaced-title">
          <h2 id="proposal-replaced-title"><History size={16} aria-hidden="true" /> Replaced by version {replacedBy ?? current}</h2>
          <p>
            This version can’t be accepted or changed. {acceptedByText(version, names)}.
            {current && <> <Link to={paths.proposal(proposal.id)}>Open version {current}</Link>, the current one.</>}
          </p>
        </section>
        <ProposalDocument version={version} names={names} mySide={proposal.me.side} />
        {version.version_number > 1 && (
          <section className="match-panel proposal-versions" aria-labelledby="proposal-version-changes-title">
            <div className="match-panel-head">
              <h2 id="proposal-version-changes-title">What changed from version {version.version_number - 1}</h2>
            </div>
            <div className="proposal-version-changes proposal-version-changes-page">
              <VersionChanges businessId={business.id} proposal={proposal} versionNumber={version.version_number} terms={version.terms} />
            </div>
          </section>
        )}
      </div>
    </>
  )
}
