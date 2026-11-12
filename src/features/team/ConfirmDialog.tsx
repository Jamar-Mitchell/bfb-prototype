import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

interface ConfirmDialogProps {
  kicker: string
  title: string
  children: ReactNode
  confirmLabel: string
  busyLabel: string
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Asks before a destructive team action (remove, leave, revoke). Built from the prototype's
 * modal. Focus starts on Cancel, Escape cancels, and Tab stays inside the dialog.
 */
export function ConfirmDialog({ kicker, title, children, confirmLabel, busyLabel, busy, onConfirm, onCancel }: ConfirmDialogProps) {
  const titleId = useId()
  const bodyId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

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
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? [])
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
      <div
        className="quick-modal team-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        ref={dialogRef}
        onKeyDown={onKeyDown}
      >
        <div className="modal-head">
          <div><span>{kicker}</span><h2 id={titleId}>{title}</h2></div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onCancel} disabled={busy}><X size={19} aria-hidden="true" /></button>
        </div>
        <div className="modal-body team-confirm-body" id={bodyId}>{children}</div>
        <div className="modal-footer">
          <button type="button" className="button button-secondary" ref={cancelRef} onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="button button-danger" onClick={onConfirm} disabled={busy}>{busy ? busyLabel : confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
