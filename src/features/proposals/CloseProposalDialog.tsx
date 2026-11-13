import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { TextareaField } from '../../components/forms'
import { toApiError, type ApiError } from '../../lib/api/errors'
import { applyApiFieldErrors } from '../../lib/forms/applyApiFieldErrors'
import type { CloseBody } from './proposalsApi'

export const CLOSE_TEXT_MAX = 1000

export interface CloseDialogCopy {
  kicker: string
  title: string
  intro: string
  legend: string
  confirm: string
  busy: string
}

const schema = z.object({
  // An unchecked radio group is null in the browser and '' before any choice.
  reason: z.string({ error: 'Choose a reason.' }).min(1, 'Choose a reason.'),
  text: z.string().trim().max(CLOSE_TEXT_MAX, `Keep it under ${CLOSE_TEXT_MAX.toLocaleString('en-US')} characters.`),
})

type CloseForm = z.infer<typeof schema>

interface CloseProposalDialogProps<Reason extends string> {
  copy: CloseDialogCopy
  reasons: Record<Reason, string>
  otherName: string
  /** Sends the decline or withdrawal. Throws on failure; the dialog shows the error and stays open. */
  onSubmit: (body: CloseBody<Reason>) => Promise<void>
  onCancel: () => void
  describeError?: (error: ApiError) => string | undefined
}

/**
 * Declines or withdraws a proposal with a required reason and an optional note, both for BFB
 * staff only. Built like the match decline dialog: focus starts on the first reason, Escape
 * cancels, and Tab stays inside.
 */
export function CloseProposalDialog<Reason extends string>({ copy, reasons, otherName, onSubmit, onCancel, describeError }: CloseProposalDialogProps<Reason>) {
  const titleId = useId()
  const introId = useId()
  const errorId = useId()
  const dialogRef = useRef<HTMLFormElement>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CloseForm>({ resolver: zodResolver(schema), defaultValues: { reason: '', text: '' } })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus()
    return () => previous?.focus?.()
  }, [])

  const submit = handleSubmit(async ({ reason, text }) => {
    setFormError(null)
    try {
      await onSubmit({ reason: reason as Reason, text: text || null })
    } catch (caught) {
      const error = toApiError(caught)
      const unmatched = applyApiFieldErrors<CloseForm>(error, setError, { knownFields: ['reason', 'text'] })
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
          <div><span>{copy.kicker}</span><h2 id={titleId}>{copy.title}</h2></div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onCancel} disabled={isSubmitting}><X size={19} aria-hidden="true" /></button>
        </div>
        <div className="modal-body">
          <p className="match-dialog-intro" id={introId}>{copy.intro}</p>
          <fieldset className="match-choices" disabled={isSubmitting} aria-describedby={errors.reason ? errorId : undefined}>
            <legend>{copy.legend}</legend>
            {(Object.keys(reasons) as Reason[]).map((reason) => (
              <label key={reason} className="match-choice">
                <input type="radio" value={reason} {...register('reason')} />
                <span>{reasons[reason]}</span>
              </label>
            ))}
            {errors.reason && <p className="form-field-error" id={errorId} role="alert">{errors.reason.message}</p>}
          </fieldset>
          <TextareaField
            label="Anything else BFB should know?"
            hint={`Optional, up to ${CLOSE_TEXT_MAX.toLocaleString('en-US')} characters.`}
            rows={3}
            maxLength={CLOSE_TEXT_MAX}
            error={errors.text?.message}
            disabled={isSubmitting}
            {...register('text')}
          />
          <p className="match-private"><Lock size={13} aria-hidden="true" /> Your reason and note are seen by BFB only, never by {otherName}.</p>
          {formError && <p className="match-notice match-notice-error" role="alert">{formError}</p>}
        </div>
        <div className="modal-footer">
          <button type="button" className="button button-secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
          <button type="submit" className="button button-danger" disabled={isSubmitting}>{isSubmitting ? copy.busy : copy.confirm}</button>
        </div>
      </form>
    </div>
  )
}
