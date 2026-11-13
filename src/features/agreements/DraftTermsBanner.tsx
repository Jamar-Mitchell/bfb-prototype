import { TriangleAlert } from 'lucide-react'

import { DRAFT_TERMS_BANNER } from './agreementCopy'

/**
 * The banner every agreement screen shows while the legal documents it uses are drafts.
 * Deliberately loud, and never dismissable.
 */
export function DraftTermsBanner({ detail }: { detail?: string }) {
  return (
    <div className="agreement-draft-banner" role="note" aria-label="Draft terms">
      <TriangleAlert size={20} aria-hidden="true" />
      <div>
        <strong>{DRAFT_TERMS_BANNER}</strong>
        {detail && <p>{detail}</p>}
      </div>
    </div>
  )
}
