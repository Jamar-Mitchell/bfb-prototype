import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

import { formatAmount } from '../listings/money'
import { CashSentence } from './ProposalDocument'
import { formatFullDate } from './proposalCopy'
import { normalizeTerms, otherSide, sideTotal } from './proposalDraft'
import type { Proposal, SentVersion, Side } from './proposalsApi'

/**
 * Confirms accepting the current version, summarising what this business provides, what it
 * receives, the cash adjustment and the end date.
 */
export function AcceptProposalDialog({ proposal, version, busy, error, onAccept, onCancel }: {
  proposal: Proposal
  version: SentVersion
  busy: boolean
  error: ReactNode
  onAccept: () => void
  onCancel: () => void
}) {
  const titleId = useId()
  const bodyId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const terms = normalizeTerms(version.terms)
  const me: Side = proposal.me.side
  const names = { [me]: proposal.me.business.display_name, [otherSide(me)]: proposal.other.business.display_name } as Record<Side, string>
  const otherName = proposal.other.business.display_name
  const money = (minor: number) => formatAmount(minor, terms.currency)
  const titles = (side: Side) => terms.sides[side].services.map((service) => service.title ?? 'Untitled service').join(', ') || 'Nothing'
  const otherAccepted = version.accepted_by.includes(otherSide(me))

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()
    return () => previous?.focus?.()
  }, [])

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !busy) {
      event.preventDefault()
      onCancel()
    } else if (event.key === 'Tab') {
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]') ?? [])
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="match-dialog proposal-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId} ref={dialogRef} onKeyDown={onKeyDown}>
        <div className="modal-head">
          <div><span>ACCEPT PROPOSAL</span><h2 id={titleId}>Accept version {version.version_number}?</h2></div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onCancel} disabled={busy}><X size={19} aria-hidden="true" /></button>
        </div>
        <div className="modal-body">
          <dl className="proposal-accept-summary" aria-label="What you are agreeing to">
            <div><dt>{names[me]} provides</dt><dd>{titles(me)} <span>· {money(sideTotal(terms, me))}</span></dd></div>
            <div><dt>{names[me]} receives</dt><dd>{titles(otherSide(me))} <span>· {money(sideTotal(terms, otherSide(me)))}</span></dd></div>
            <div><dt>Cash adjustment</dt><dd><CashSentence terms={terms} names={names} money={money} /></dd></div>
            <div><dt>Work ends</dt><dd>{terms.end_date ? formatFullDate(terms.end_date) : 'No end date'}</dd></div>
          </dl>
          <p className="match-dialog-intro" id={bodyId}>
            {otherAccepted
              ? `${otherName} accepted this version when they sent it, so accepting makes it final for both businesses.`
              : `Once ${otherName} accepts it too, it is final for both businesses.`}{' '}
            {proposal.draft ? `Your counteroffer draft (version ${proposal.draft.version_number}) is deleted. ` : ''}
            The agreement and signatures come next.
          </p>
          {error}
        </div>
        <div className="modal-footer">
          <button type="button" className="button button-secondary" ref={cancelRef} onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="button button-primary" onClick={onAccept} disabled={busy}>{busy ? 'Accepting…' : 'Accept proposal'}</button>
        </div>
      </div>
    </div>
  )
}
