import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, FileSearch } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { EmptyState, ErrorState, LoadingState, showToast } from '../../components/feedback'
import { toApiError, type ApiError } from '../../lib/api/errors'
import { updateBusinessRole } from '../../lib/businesses/activeBusiness'
import { useActiveBusiness } from '../../lib/businesses/useActiveBusiness'
import { useSessionStore } from '../../stores/session'
import { formatMatchDate } from '../matching/matchInboxDisplay'
import { AgreementFrame } from './AgreementFrame'
import {
  AGREEMENT_STATUS_LABELS,
  agreementStandingText,
  entityTypeLabel,
  formatAddress,
  isDraftTerms,
  LEGAL_REVIEW_LABELS,
  signingConflictText,
} from './agreementCopy'
import { getAgreement, OPEN_AGREEMENT_STATUSES, signerFor, type Agreement, type AgreementParty } from './agreementsApi'
import { DraftTermsBanner } from './DraftTermsBanner'
import { NameSignerDialog } from './NameSignerDialog'
import { SignedDocumentsPanel } from './SignedDocuments'
import { SignersCard, YourSignaturePanel } from './SigningPanels'
import '../matching/MatchInbox.css'
import '../proposals/Proposals.css'
import '../proposals/ProposalReview.css'
import './Agreements.css'

/**
 * `/agreements/:id`: the Exchange Agreement BFB generated from an accepted proposal, as a
 * document in a sandboxed frame, with where it stands, the parties as named in it, the Exchange
 * Terms version it incorporates and its fingerprint. Who signs for each business is in the side
 * column; the named signer confirms and signs in "Your signature" above the document (FE-5.2).
 */
export function AgreementPage() {
  const { agreementId = '' } = useParams()
  return <AgreementView key={agreementId} agreementId={agreementId} />
}

function AgreementView({ agreementId }: { agreementId: string }) {
  const business = useActiveBusiness()
  const [agreement, setAgreement] = useState<Agreement | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [naming, setNaming] = useState(false)
  const userId = useSessionStore((state) => state.user?.id)

  useEffect(() => {
    let live = true
    setLoadError(null)
    getAgreement(business.id, agreementId)
      .then((result) => {
        if (live) setAgreement(result)
      })
      .catch((error: unknown) => {
        if (live) setLoadError(toApiError(error))
      })
    return () => {
      live = false
    }
  }, [business.id, agreementId, reloadKey])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  /** A signing action was refused because something changed: load the agreement again and say why. */
  const onConflict = useCallback((error: ApiError) => {
    if (error.code === 'business_role_required') updateBusinessRole(business.id, 'member')
    setNaming(false)
    setNotice(signingConflictText(error))
    reload()
  }, [business.id, reload])

  const back = <Link className="back-button match-back" to={paths.agreements}><ArrowLeft size={17} aria-hidden="true" /> Back to agreements</Link>

  if (!agreement) {
    const notFound = loadError !== null && toApiError(loadError).code === 'not_found'
    return (
      <>
        {back}
        {notFound ? (
          <EmptyState
            icon={FileSearch}
            title="We couldn’t find this agreement"
            description={`Only the two businesses in an agreement can open it. Check the link, or whether you’re acting for the right business (you’re acting for ${business.name}).`}
            action={<Link className="button button-secondary button-small" to={paths.agreements}>See your agreements</Link>}
          />
        ) : loadError ? (
          <ErrorState title="We couldn’t load this agreement" error={loadError} onRetry={() => setReloadKey((key) => key + 1)} />
        ) : (
          <LoadingState label="Loading agreement…" />
        )}
      </>
    )
  }

  const me = agreement.parties.find((party) => party.side === agreement.my_side)
  const other = agreement.parties.find((party) => party.side !== agreement.my_side)
  const otherName = other?.display_name ?? other?.legal_name ?? 'The other business'
  const open = OPEN_AGREEMENT_STATUSES.includes(agreement.status)
  const terms = agreement.exchange_terms

  return (
    <>
      {back}
      <div className="page-heading match-heading proposal-heading">
        <div>
          <span>EXCHANGE AGREEMENT</span>
          <h1>{otherName}</h1>
          <p>
            From version {agreement.accepted_version_number} of <Link to={paths.proposal(agreement.proposal_id)}>your proposal</Link>, accepted on {formatMatchDate(agreement.accepted_at)}.
          </p>
        </div>
        <div>
          <div className="match-card-pills">
            <span className={`match-pill agreement-pill-${agreement.status}`}>{AGREEMENT_STATUS_LABELS[agreement.status]}</span>
          </div>
        </div>
      </div>
      {notice && <p className="match-notice match-notice-error" role="alert">{notice}</p>}
      {isDraftTerms(agreement) && (
        <DraftTermsBanner detail="This agreement was generated from draft legal documents for testing BFB. Don’t rely on it, and don’t exchange real work under it." />
      )}
      <div className="match-layout proposal-review-layout agreement-layout">
        <div className="match-main">
          <SignedDocumentsPanel agreement={agreement} businessId={business.id} onConflict={onConflict} />
          <YourSignaturePanel
            agreement={agreement}
            userId={userId}
            businessId={business.id}
            onAgreement={(updated) => {
              setNotice(null)
              setAgreement(updated)
            }}
            onReload={() => {
              setNotice(null)
              reload()
            }}
            onConflict={onConflict}
          />
          <section className={`match-panel proposal-standing agreement-standing-${agreement.status}`} aria-labelledby="agreement-standing-title">
            <h2 id="agreement-standing-title" className="match-side-title">Where it stands</h2>
            <p>{agreementStandingText(agreement)}</p>
          </section>
          <section className="match-panel agreement-document" aria-labelledby="agreement-document-title">
            <div className="match-panel-head">
              <h2 id="agreement-document-title">Business Exchange Agreement</h2>
              <p>
                The agreement as BFB generated it, with {me?.display_name ?? 'your business'} and {otherName} as they were named when the proposal was accepted. It incorporates the{' '}
                <ExchangeTermsLink version={terms.version} />.
              </p>
            </div>
            <AgreementFrame html={agreement.html} title={`Business Exchange Agreement between ${me?.display_name ?? 'your business'} and ${otherName}`} />
            <p className="agreement-fingerprint">
              Document fingerprint (SHA-256): <code>{agreement.content_sha256}</code>
              <br />
              Generated {formatMatchDate(agreement.generated_at)} from template {agreement.template.version}.
            </p>
          </section>
        </div>
        <aside className="match-side">
          <SignersCard agreement={agreement} business={business} onNameSigner={() => setNaming(true)} />
          <section className="match-panel match-panel-body" aria-labelledby="agreement-status-title">
            <h2 id="agreement-status-title" className="match-side-title">Status</h2>
            <dl className="match-status-facts">
              <div><dt>Status</dt><dd>{AGREEMENT_STATUS_LABELS[agreement.status]}</dd></div>
              {open && <div><dt>Sign by</dt><dd>{formatMatchDate(agreement.expires_at)}</dd></div>}
              {agreement.signed_at && <div><dt>Signed</dt><dd>{formatMatchDate(agreement.signed_at)}</dd></div>}
              {agreement.exchange && <div><dt>Exchange</dt><dd><Link to={paths.exchange(agreement.exchange.id)}>Active</Link></dd></div>}
              <div><dt>Proposal</dt><dd><Link to={paths.proposal(agreement.proposal_id)}>Version {agreement.accepted_version_number}</Link></dd></div>
              <div><dt>Exchange Terms</dt><dd><ExchangeTermsLink version={terms.version} short /></dd></div>
              <div><dt>Legal review</dt><dd>{LEGAL_REVIEW_LABELS[agreement.legal_review_status]}</dd></div>
            </dl>
          </section>
          <section className="match-panel match-panel-body" aria-labelledby="agreement-parties-title">
            <h2 id="agreement-parties-title" className="match-side-title">Parties</h2>
            <ul className="agreement-parties">
              {[me, other].filter((party): party is AgreementParty => Boolean(party)).map((party) => (
                <PartySummary key={party.side} party={party} mine={party.side === agreement.my_side} />
              ))}
            </ul>
            {me && <p className="agreement-parties-note">As named when the proposal was accepted. Later profile changes don’t change the agreement.</p>}
          </section>
        </aside>
      </div>
      {naming && (
        <NameSignerDialog
          business={business}
          agreementId={agreement.id}
          userId={userId}
          current={signerFor(agreement, agreement.my_side)}
          onNamed={(signer) => {
            setNaming(false)
            setNotice(null)
            setAgreement({ ...agreement, signers: [...agreement.signers.filter((item) => item.side !== signer.side), signer].sort((x, y) => x.side.localeCompare(y.side)) })
            showToast(signer.user_id === userId ? 'You’re named to sign. Confirm your details to continue.' : `${signer.full_name} is named to sign. They confirm their details next.`)
          }}
          onConflict={onConflict}
          onCancel={() => setNaming(false)}
        />
      )}
    </>
  )
}

function ExchangeTermsLink({ version, short = false }: { version: string; short?: boolean }) {
  return (
    <Link className="agreement-terms-link" to={paths.exchangeTermsVersion(version)} target="_blank" rel="noopener" aria-label={`BFB Exchange Terms, version ${version} (opens in a new tab)`}>
      {short ? version : `BFB Exchange Terms, version ${version}`}
      <ArrowUpRight size={13} aria-hidden="true" />
    </Link>
  )
}

function PartySummary({ party, mine }: { party: AgreementParty; mine: boolean }) {
  const address = formatAddress(party.registered_address)
  const entity = entityTypeLabel(party.entity_type)
  return (
    <li className="agreement-party">
      <div className="agreement-party-head">
        <strong>{party.legal_name ?? party.display_name ?? 'Not stated'}</strong>
        {mine && <span className="match-pill">Your business</span>}
      </div>
      {party.display_name && party.display_name !== party.legal_name && <p>On BFB as {party.display_name}</p>}
      {entity && <p>{entity}</p>}
      {address && <p>{address}</p>}
      {party.accepted_at && <p className="agreement-party-muted">Accepted the proposal on {formatMatchDate(party.accepted_at)}</p>}
    </li>
  )
}
