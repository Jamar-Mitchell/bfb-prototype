import { useEffect, useId, useState } from 'react'
import { ArrowRight, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { toApiError } from '../../lib/api/errors'
import { CHANGE_KIND_LABELS, describeChange } from './changeCopy'
import { formatFullDate } from './proposalCopy'
import { normalizeTerms } from './proposalDraft'
import { getVersion, getVersionChanges, type Proposal, type ProposalTerms, type Side, type TermsChange, type VersionSummary } from './proposalsApi'

function namesOf(proposal: Proposal): Record<Side, string> {
  return { [proposal.me.side]: proposal.me.business.display_name, [proposal.other.side]: proposal.other.business.display_name } as Record<Side, string>
}

/** "Accepted by Northstar Digital and Harbor Bookkeeping", or who has not yet. */
export function acceptedByText(version: Pick<VersionSummary, 'accepted_by'>, names: Record<Side, string>): string {
  const sides = (['a', 'b'] as const).filter((side) => version.accepted_by.includes(side))
  if (sides.length === 0) return 'Not accepted'
  return `Accepted by ${sides.map((side) => names[side]).join(' and ')}`
}

/**
 * Every sent version, newest first: who sent it, when, and which businesses accepted it. Each
 * version after the first can show what changed from the one before; older versions open
 * read-only.
 */
export function VersionTimeline({ proposal, businessId }: { proposal: Proposal; businessId: string }) {
  const names = namesOf(proposal)
  const versions = [...proposal.versions].reverse()
  if (versions.length === 0) return null
  return (
    <section className="match-panel proposal-versions" aria-labelledby="proposal-versions-title">
      <div className="match-panel-head">
        <h2 id="proposal-versions-title">Versions</h2>
        <p>Every version sent, newest first. A sent version never changes.</p>
      </div>
      <ol className="proposal-version-list" aria-label="Versions">
        {versions.map((version) => {
          const accepted = proposal.accepted_version_number === version.version_number
          return (
            <li key={version.version_number} className={`proposal-version${version.is_current ? ' proposal-version-current' : ''}`}>
              <div className="proposal-version-head">
                <strong>Version {version.version_number}</strong>
                {accepted ? (
                  <span className="match-pill proposal-pill-accepted">Accepted</span>
                ) : version.is_current ? (
                  <span className="match-pill proposal-pill-sent">Current</span>
                ) : (
                  <span className="match-pill">Replaced</span>
                )}
              </div>
              <p>Sent by {names[version.author_side]} on {formatFullDate(version.sent_at)}. {acceptedByText(version, names)}.</p>
              {!version.is_current && (
                <Link className="proposal-version-open" to={paths.proposalVersion(proposal.id, version.version_number)}>
                  <FileText size={14} aria-hidden="true" /> Open version {version.version_number}
                </Link>
              )}
              {version.version_number > 1 && (
                <ChangesToggle
                  businessId={businessId}
                  proposal={proposal}
                  versionNumber={version.version_number}
                  initiallyOpen={version.is_current}
                />
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function ChangesToggle({ businessId, proposal, versionNumber, initiallyOpen }: { businessId: string; proposal: Proposal; versionNumber: number; initiallyOpen: boolean }) {
  const [open, setOpen] = useState(initiallyOpen)
  const listId = useId()
  const terms = proposal.current_version?.version_number === versionNumber ? proposal.current_version.terms : null
  return (
    <div className="proposal-version-changes">
      <button type="button" className="text-button proposal-version-toggle" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((value) => !value)}>
        {open ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />} What changed from version {versionNumber - 1}
      </button>
      <div id={listId} hidden={!open}>
        {open && <VersionChanges businessId={businessId} proposal={proposal} versionNumber={versionNumber} terms={terms} />}
      </div>
    </div>
  )
}

type ChangesState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; changes: TermsChange[]; from: number; terms: ProposalTerms }

/**
 * What changed from the version before `versionNumber`, from the API's changes endpoint.
 * Reads the version's own terms too (unless given), to name the items that changed.
 */
export function VersionChanges({ businessId, proposal, versionNumber, terms }: { businessId: string; proposal: Proposal; versionNumber: number; terms: ProposalTerms | null }) {
  const [state, setState] = useState<ChangesState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    setState({ kind: 'loading' })
    Promise.all([
      getVersionChanges(businessId, proposal.id, versionNumber),
      terms ? Promise.resolve(terms) : getVersion(businessId, proposal.id, versionNumber).then((version) => version.terms),
    ])
      .then(([result, versionTerms]) => {
        if (live) setState({ kind: 'ready', changes: result.changes, from: result.from_version_number, terms: versionTerms })
      })
      .catch((error: unknown) => {
        if (live) setState({ kind: 'error', message: toApiError(error).userMessage })
      })
    return () => {
      live = false
    }
  }, [businessId, proposal.id, versionNumber, terms, attempt])

  if (state.kind === 'loading') return <p className="proposal-changes-note" role="status">Loading what changed…</p>
  if (state.kind === 'error') {
    return (
      <p className="proposal-changes-note proposal-changes-error" role="alert">
        We couldn’t load what changed. {state.message}{' '}
        <button type="button" className="text-button" onClick={() => setAttempt((count) => count + 1)}>Try again</button>
      </p>
    )
  }
  if (state.changes.length === 0) return <p className="proposal-changes-note">Nothing changed from version {state.from}.</p>

  const normalized = normalizeTerms(state.terms)
  const context = { names: namesOf(proposal), currency: normalized.currency, terms: normalized }
  return (
    <ul className="proposal-changes" aria-label={`Changes from version ${state.from} to version ${versionNumber}`}>
      {state.changes.map((change, at) => {
        const described = describeChange(change, context)
        return (
          <li key={at} className={`proposal-change proposal-change-${described.kind}`}>
            <span className="proposal-change-kind">{CHANGE_KIND_LABELS[described.kind]}</span>
            <div>
              <strong>{described.subject}</strong>
              {described.summary && <p>{described.summary}</p>}
              {described.before !== undefined && (
                <p className="proposal-change-values">
                  <del aria-label={`Before: ${described.before}`}>{described.before}</del>
                  <ArrowRight size={13} aria-hidden="true" />
                  <ins aria-label={`After: ${described.after}`}>{described.after}</ins>
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
