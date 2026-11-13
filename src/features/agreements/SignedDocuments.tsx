import { useState } from 'react'
import { ArrowRight, FileCheck2, FileDown } from 'lucide-react'
import { Link } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { showErrorToast } from '../../components/feedback'
import { toApiError, type ApiError } from '../../lib/api/errors'
import { formatMatchDate } from '../matching/matchInboxDisplay'
import { getSignedFile, type Agreement, type SignedFileKind } from './agreementsApi'

const FILES: Array<{ kind: SignedFileKind; label: string; noun: string }> = [
  { kind: 'signed-document', label: 'Signed agreement', noun: 'signed agreement' },
  { kind: 'certificate', label: 'Signature certificate', noun: 'signature certificate' },
]

/**
 * Once both businesses signed: download the signed agreement and the signature certificate,
 * and go to the exchange. Each download asks the API for a fresh short-lived link when clicked
 * and opens it in a new tab; the link is never kept.
 */
export function SignedDocumentsPanel({ agreement, businessId, onConflict }: {
  agreement: Agreement
  businessId: string
  onConflict: (error: ApiError) => void
}) {
  const [busy, setBusy] = useState<SignedFileKind | null>(null)
  if (agreement.status !== 'signed') return null
  const documents = agreement.signed_document

  const download = async (kind: SignedFileKind, noun: string) => {
    setBusy(kind)
    // Open the tab while the click still counts as the user's, so popup blockers allow it,
    // then point it at the link once the API returns one.
    const tab = window.open('', '_blank')
    if (tab) tab.opener = null
    try {
      const file = await getSignedFile(businessId, agreement.id, kind)
      if (tab) tab.location.href = file.url
      else window.open(file.url, '_blank', 'noopener')
    } catch (caught) {
      tab?.close()
      const error = toApiError(caught)
      if (error.code === 'invalid_agreement_status' || error.code === 'not_found') onConflict(error)
      else showErrorToast(`We couldn’t open the ${noun}. ${error.userMessage}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="match-panel match-panel-body agreement-signed" aria-labelledby="agreement-signed-title">
      <h2 id="agreement-signed-title" className="match-side-title"><FileCheck2 size={14} aria-hidden="true" /> Signed documents</h2>
      {documents ? (
        <>
          <p>
            Download the signed agreement, with the signature certificate at the end, or the certificate on its own. Each link works for 15 minutes; download again for a fresh one.
          </p>
          <div className="agreement-signed-actions">
            {FILES.map(({ kind, label, noun }) => (
              <button key={kind} type="button" className="button button-secondary" onClick={() => void download(kind, noun)} disabled={busy !== null} aria-label={`Download the ${noun} (opens in a new tab)`}>
                <FileDown size={16} aria-hidden="true" /> {busy === kind ? 'Opening…' : label}
              </button>
            ))}
            {agreement.exchange && (
              <Link className="button button-primary" to={paths.exchange(agreement.exchange.id)}>Open the exchange <ArrowRight size={16} aria-hidden="true" /></Link>
            )}
          </div>
          <p className="agreement-signed-hashes">
            Signed agreement file (SHA-256): <code>{documents.document_sha256}</code>
            <br />
            Certificate file (SHA-256): <code>{documents.certificate_sha256}</code>
            <br />
            Stored {formatMatchDate(documents.created_at)}.
          </p>
        </>
      ) : (
        <p>BFB is preparing the signed agreement and its signature certificate. Reload the page in a moment to download them.</p>
      )}
    </section>
  )
}
