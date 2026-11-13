import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { TextareaField } from '../../components/forms'
import { toApiError, type ApiError } from '../../lib/api/errors'
import { applyApiFieldErrors } from '../../lib/forms/applyApiFieldErrors'
import { DECLINE_REASON_LABELS, type DeclineReason } from './fitCopy'
import type { DeclineBody } from './matchInboxApi'

export const DECLINE_TEXT_MAX = 1000

const REASONS = Object.keys(DECLINE_REASON_LABELS) as DeclineReason[]

const schema = z.object({
  reason: z.string(),
  text: z.string().trim().max(DECLINE_TEXT_MAX, `Keep it under ${DECLINE_TEXT_MAX.toLocaleString('en-US')} characters.`),
})

type DeclineForm = z.infer<typeof schema>

interface DeclineMatchDialogProps {
  otherName: string
  /** Sends the decline. Throws on failure; the dialog shows the error and stays open. */
  onSubmit: (body: DeclineBody) => Promise<void>
  onCancel: () => void
  /** Copy for a refused decline, when the default message for its code is not enough. */
  describeError?: (error: ApiError) => string | undefined
}

/**
 * Declines a match, with an optional reason and note for BFB. Built like the admin notes
 * dialog: focus starts on the first reason, Escape cancels, and Tab stays inside.
 */
export function DeclineMatchDialog({ otherName, onSubmit, onCancel, describeError }: DeclineMatchDialogProps) {
  const titleId = useId()
  const introId = useId()
  const dialogRef = useRef<HTMLFormElement>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DeclineForm>({ resolver: zodResolver(schema), defaultValues: { reason: '', text: '' } })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus()
    return () => previous?.focus?.()
  }, [])

  const submit = handleSubmit(async ({ reason, text }) => {
    setFormError(null)
    try {
      await onSubmit({ reason: (reason || null) as DeclineReason | null, text: text || null })
    } catch (caught) {
      const error = toApiError(caught)
      const unmatched = applyApiFieldErrors<DeclineForm>(error, setError, { knownFields: ['reason', 'text'] })
      if (error.fieldErrors.length === 0 || unmatched.length > 0) setFormError(describeError?.(error) ?? error.userMessage)
    }
  })

  const onKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape' && !isSubmitting) {
      event.preventDefault()
      onCancel()
    } else if (event.key === 'Tab') {
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), input:checked:not(:disabled)') ?? [])
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
      <form
        className="match-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={introId}
        ref={dialogRef}
        onKeyDown={onKeyDown}
        onSubmit={submit}
        noValidate
      >
        <div className="modal-head">
          <div><span>DECLINE MATCH</span><h2 id={titleId}>Decline the match with {otherName}?</h2></div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onCancel} disabled={isSubmitting}><X size={19} aria-hidden="true" /></button>
        </div>
        <div className="modal-body">
          <p className="match-dialog-intro" id={introId}>
            The match closes for both businesses. {otherName} will see that you declined, but not why.
          </p>
          <fieldset className="match-choices" disabled={isSubmitting}>
            <legend>Why are you declining? <span>Optional</span></legend>
            {REASONS.map((reason) => (
              <label key={reason} className="match-choice">
                <input type="radio" value={reason} {...register('reason')} />
                <span>{DECLINE_REASON_LABELS[reason]}</span>
              </label>
            ))}
          </fieldset>
          <TextareaField
            label="Anything else BFB should know?"
            hint={`Optional, up to ${DECLINE_TEXT_MAX.toLocaleString('en-US')} characters.`}
            rows={3}
            maxLength={DECLINE_TEXT_MAX}
            error={errors.text?.message}
            disabled={isSubmitting}
            {...register('text')}
          />
          <p className="match-private"><Lock size={13} aria-hidden="true" /> Your reason and note are seen by BFB only, never by {otherName}.</p>
          {formError && <p className="match-notice match-notice-error" role="alert">{formError}</p>}
        </div>
        <div className="modal-footer">
          <button type="button" className="button button-secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
          <button type="submit" className="button button-danger" disabled={isSubmitting}>{isSubmitting ? 'Declining…' : 'Decline match'}</button>
        </div>
      </form>
    </div>
  )
}
