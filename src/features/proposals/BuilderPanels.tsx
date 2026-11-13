import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, Cloud, CloudAlert, LoaderCircle, X } from 'lucide-react'

import { formatAmount } from '../listings/money'
import { formatMatchDate } from '../matching/matchInboxDisplay'
import { CASH_TIMING_LABELS, describeMissing, type MissingItem } from './proposalCopy'
import { cashForDifference, compareValues, type DraftTerms } from './proposalDraft'
import { EXPIRY_DAYS, type Side } from './proposalsApi'
import type { SaveStatus } from './useDraftAutosave'

/** Brings a section, service or milestone into view and moves focus to it. */
export function goTo(anchor: string) {
  const target = document.getElementById(anchor)
  if (!target) return
  target.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  target.focus({ preventScroll: true })
}

const SAVE_COPY: Record<SaveStatus, string> = {
  saved: 'All changes saved',
  pending: 'Unsaved changes',
  saving: 'Saving…',
  failed: 'Couldn’t save your changes',
}

/** Saved, saving or failed. Announced politely so a screen reader hears the outcome. */
export function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  const Icon = status === 'saved' ? CircleCheck : status === 'failed' ? CloudAlert : status === 'saving' ? LoaderCircle : Cloud
  return (
    <span className={`proposal-save proposal-save-${status}`} role="status" aria-live="polite">
      <Icon size={15} aria-hidden="true" className={status === 'saving' ? 'feedback-spinner' : undefined} />
      {SAVE_COPY[status]}
      {status === 'failed' && (
        <button type="button" className="text-button proposal-save-retry" onClick={onRetry}>Try again</button>
      )}
    </span>
  )
}

/** Each business's total and the difference, in amounts and words. Offers a cash adjustment for the difference. */
export function ValueComparisonPanel({ terms, names, mySide, onAddCash }: { terms: DraftTerms; names: Record<Side, string>; mySide: Side; onAddCash: () => void }) {
  const comparison = compareValues(terms)
  const order: Side[] = mySide === 'a' ? ['a', 'b'] : ['b', 'a']
  const money = (minor: number) => formatAmount(minor, terms.currency)
  const cash = terms.cash_adjustment
  const suggested = cashForDifference(comparison)
  return (
    <section className="match-panel match-panel-body proposal-values" aria-labelledby="proposal-values-title">
      <h2 id="proposal-values-title" className="match-side-title">Value comparison</h2>
      <dl className="match-status-facts">
        {order.map((side) => (
          <div key={side}>
            <dt>{names[side]} provides</dt>
            <dd>{money(comparison.totals[side])}</dd>
          </div>
        ))}
        <div className="proposal-values-difference"><dt>Difference</dt><dd>{money(comparison.difference)}</dd></div>
      </dl>
      <p className="proposal-values-words">
        {comparison.higher
          ? `${names[comparison.higher]}’s services are valued ${money(comparison.difference)} more.`
          : 'Both businesses’ services are valued the same.'}
      </p>
      {order.map((side) =>
        comparison.unvalued[side] > 0 ? (
          <p key={side} className="proposal-values-note">
            {comparison.unvalued[side] === 1 ? '1 service' : `${comparison.unvalued[side]} services`} from {names[side]} {comparison.unvalued[side] === 1 ? 'has' : 'have'} no value yet.
          </p>
        ) : null,
      )}
      {cash ? (
        <p className="proposal-values-cash">
          Cash adjustment: {cash.payer ? names[cash.payer] : 'someone'} pays {cash.amount_minor ? money(cash.amount_minor) : 'an amount not set yet'}
          {cash.timing ? `, ${CASH_TIMING_LABELS[cash.timing].toLowerCase()}` : ''}.
        </p>
      ) : suggested ? (
        <button type="button" className="button button-secondary button-small" onClick={onAddCash}>
          Add a cash adjustment of {money(suggested.amount_minor ?? 0)}
        </button>
      ) : null}
      <small className="proposal-values-foot">The values each business entered. BFB doesn’t score or judge the trade.</small>
    </section>
  )
}

/** What still has to be filled in before sending, from the API's `missing`, each linking to its place. */
export function MissingChecklist({ missing, terms, names, stale }: { missing: string[]; terms: DraftTerms; names: Record<Side, string>; stale: boolean }) {
  const items: MissingItem[] = missing.map((key) => describeMissing(key, terms, names))
  return (
    <section className="match-panel match-panel-body proposal-missing" aria-labelledby="proposal-missing-title">
      <h2 id="proposal-missing-title" className="match-side-title">Before you send</h2>
      {items.length === 0 ? (
        <p className="proposal-ready"><CircleCheck size={16} aria-hidden="true" /> Everything needed is filled in.</p>
      ) : (
        <ul className="proposal-missing-list" aria-label="Still missing">
          {items.map((item) => (
            <li key={item.key}>
              <CircleAlert size={14} aria-hidden="true" />
              <button type="button" className="text-button" onClick={() => goTo(item.anchor)}>{item.text}</button>
            </li>
          ))}
        </ul>
      )}
      {stale && <small className="proposal-values-foot">Updates once your latest changes are saved.</small>}
    </section>
  )
}

/** Confirms sending, with how long the other business has to answer (default 14 days). */
export function SendProposalDialog({ versionNumber, otherName, busy, error, onSend, onCancel }: {
  versionNumber: number
  otherName: string
  busy: boolean
  /** A message, or the party details prompt. */
  error: ReactNode
  onSend: (expiresInDays: number) => void
  onCancel: () => void
}) {
  const titleId = useId()
  const bodyId = useId()
  const selectId = useId()
  const [days, setDays] = useState<number>(EXPIRY_DAYS.default)
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const respondBy = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

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
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), a[href]') ?? [])
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
          <div><span>SEND PROPOSAL</span><h2 id={titleId}>Send version {versionNumber} to {otherName}?</h2></div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onCancel} disabled={busy}><X size={19} aria-hidden="true" /></button>
        </div>
        <div className="modal-body">
          <p className="match-dialog-intro" id={bodyId}>
            Sending counts as your business accepting these terms. {otherName} can then accept, decline or send a counteroffer. You can’t change a version once it is sent.
          </p>
          <div className="form-field">
            <label className="form-field-label" htmlFor={selectId}>Time to respond</label>
            <select id={selectId} className="form-field-control" value={days} onChange={(event) => setDays(Number(event.target.value))} disabled={busy}>
              {Array.from({ length: EXPIRY_DAYS.max - EXPIRY_DAYS.min + 1 }, (_, at) => EXPIRY_DAYS.min + at).map((value) => (
                <option key={value} value={value}>{value === 1 ? '1 day' : `${value} days`}</option>
              ))}
            </select>
            <p className="form-field-hint">{otherName} can respond until {formatMatchDate(respondBy.toISOString())}. After that the proposal expires.</p>
          </div>
          {typeof error === 'string' ? <p className="match-notice match-notice-error" role="alert">{error}</p> : error}
        </div>
        <div className="modal-footer">
          <button type="button" className="button button-secondary" ref={cancelRef} onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="button button-primary" onClick={() => onSend(days)} disabled={busy}>{busy ? 'Sending…' : 'Send proposal'}</button>
        </div>
      </div>
    </div>
  )
}
