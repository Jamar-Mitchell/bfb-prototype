import { useEffect, useState } from 'react'
import { FileSearch } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { EmptyState, ErrorState, LoadingState, Toaster } from '../../components/feedback'
import { toApiError } from '../../lib/api/errors'
import { PublicHeader } from '../businesses/PublicBusinessProfile'
import { formatMatchDate } from '../matching/matchInboxDisplay'
import { isDraftTerms, LEGAL_REVIEW_LABELS } from './agreementCopy'
import { getExchangeTerms, type ExchangeTerms } from './agreementsApi'
import { DraftTermsBanner } from './DraftTermsBanner'
import '../businesses/PublicBusinessProfile.css'
import './Agreements.css'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; terms: ExchangeTerms }
  | { kind: 'not-found' }
  | { kind: 'error'; error: unknown }

/**
 * `/legal/exchange-terms` and `/legal/exchange-terms/:version`: BFB's standard Exchange Terms,
 * which every agreement incorporates by reference. Public, so it sits outside the app shell like
 * a public business profile. Agreements link to the exact version they use.
 */
export function ExchangeTermsPage() {
  const { version } = useParams()
  return <ExchangeTermsView key={version ?? 'current'} version={version} />
}

function ExchangeTermsView({ version }: { version?: string }) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let live = true
    setState({ kind: 'loading' })
    getExchangeTerms(version)
      .then((terms) => {
        if (live) setState({ kind: 'ready', terms })
      })
      .catch((error: unknown) => {
        if (!live) return
        const apiError = toApiError(error)
        setState(apiError.code === 'not_found' ? { kind: 'not-found' } : { kind: 'error', error: apiError })
      })
    return () => {
      live = false
    }
  }, [version, reloadKey])

  return (
    <div className="public-profile-page">
      <PublicHeader />
      <main className="public-profile-main legal-page-main">
        {state.kind === 'loading' && <LoadingState label="Loading the Exchange Terms…" />}
        {state.kind === 'error' && <ErrorState title="We couldn’t load the Exchange Terms" error={state.error} onRetry={() => setReloadKey((key) => key + 1)} />}
        {state.kind === 'not-found' && (
          <EmptyState
            className="public-profile-card"
            icon={FileSearch}
            title={`There’s no Exchange Terms version “${version}”`}
            description="The link may be wrong. The current version is always available."
            action={<Link className="button button-secondary button-small" to={paths.exchangeTerms}>Read the current Exchange Terms</Link>}
          />
        )}
        {state.kind === 'ready' && <ExchangeTermsDocument terms={state.terms} />}
      </main>
      <Toaster />
    </div>
  )
}

function ExchangeTermsDocument({ terms }: { terms: ExchangeTerms }) {
  return (
    <article className="legal-page" aria-labelledby="legal-page-title">
      <header className="legal-page-head">
        <span>BFB LEGAL</span>
        <h1 id="legal-page-title">Exchange Terms</h1>
        <p>
          The standard terms every Business Exchange Agreement on BFB includes. Each agreement names the version it uses.
        </p>
        <dl className="legal-page-facts">
          <div><dt>Version</dt><dd>{terms.version}</dd></div>
          <div><dt>Published</dt><dd>{formatMatchDate(terms.published_at)}</dd></div>
          <div><dt>Legal review</dt><dd>{LEGAL_REVIEW_LABELS[terms.legal_review_status]}</dd></div>
        </dl>
        {!terms.is_current && (
          <p className="legal-page-replaced">
            A newer version has replaced this one. Agreements that name this version still use it. <Link to={paths.exchangeTerms}>Read the current version</Link>
          </p>
        )}
      </header>
      {isDraftTerms(terms) && <DraftTermsBanner detail="This is a working draft written to build and test BFB. It is not legal or tax advice." />}
      {/* The API renders the Markdown itself and escapes everything in it, so this fragment is safe to insert (bfb-api docs/AGREEMENTS.md). */}
      <div className="legal-page-body" dangerouslySetInnerHTML={{ __html: terms.html }} />
      <p className="agreement-fingerprint legal-page-fingerprint">
        Document fingerprint (SHA-256): <code>{terms.content_sha256}</code>
      </p>
    </article>
  )
}
