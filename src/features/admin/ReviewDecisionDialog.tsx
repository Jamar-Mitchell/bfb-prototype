import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { TextareaField } from '../../components/forms'
import { toApiError } from '../../lib/api/errors'
import { applyApiFieldErrors } from '../../lib/forms/applyApiFieldErrors'

export type DecisionKind = 'approve' | 'request-changes'

export const NOTES_MAX = 2000

const approveSchema = z.object({
  notes: z.string().trim().max(NOTES_MAX, `Keep notes under ${NOTES_MAX.toLocaleString('en-US')} characters.`),
})

const requestChangesSchema = z.object({
  notes: z
    .string()
    .trim()
    .min(1, 'Tell the business what to change.')
    .max(NOTES_MAX, `Keep notes under ${NOTES_MAX.toLocaleString('en-US')} characters.`),
})

type DecisionForm = { notes: string }

const COPY: Record<DecisionKind, { kicker: string; title: (name: string) => string; intro: string; label: string; hint: string; confirm: string; busy: string }> = {
  approve: {
    kicker: 'APPROVE BUSINESS',
    title: (name) => `Approve ${name}?`,
    intro: 'The business is marked verified, its public profile goes live and it can publish offers and needs.',
    label: 'Notes for the business (optional)',
    hint: 'Shown to the business’s team.',
    confirm: 'Approve business',
    busy: 'Approving…',
  },
  'request-changes': {
    kicker: 'REQUEST CHANGES',
    title: (name) => `Ask ${name} for changes?`,
    intro: 'The business goes back to editing and can submit again once it has made the changes.',
    label: 'What should they change?',
    hint: 'Shown to the business’s team. Be specific.',
    confirm: 'Request changes',
    busy: 'Sending…',
  },
}

interface ReviewDecisionDialogProps {
  kind: DecisionKind
  businessName: string
  /** Sends the decision. Throws on failure; the dialog shows the error and stays open. */
  onSubmit: (notes: string) => Promise<void>
  onCancel: () => void
  /** Copy for a refused decision, when the default message for its code is not enough. */
  describeError?: (error: ReturnType<typeof toApiError>) => string | undefined
}

/**
 * Confirms an approve or request-changes decision and collects the notes. Built from the
 * prototype's modal. Focus starts in the notes field, Escape cancels, and Tab stays inside.
 */
export function ReviewDecisionDialog({ kind, businessName, onSubmit, onCancel, describeError }: ReviewDecisionDialogProps) {
  const copy = COPY[kind]
  const titleId = useId()
  const introId = useId()
  const dialogRef = useRef<HTMLFormElement>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<DecisionForm>({
    resolver: zodResolver(kind === 'approve' ? approveSchema : requestChangesSchema),
    defaultValues: { notes: '' },
  })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    setFocus('notes')
    return () => previous?.focus?.()
  }, [setFocus])

  const submit = handleSubmit(async ({ notes }) => {
    setFormError(null)
    try {
      await onSubmit(notes)
    } catch (caught) {
      const error = toApiError(caught)
      const unmatched = applyApiFieldErrors<DecisionForm>(error, setError, { knownFields: ['notes'] })
      if (error.fieldErrors.length === 0 || unmatched.length > 0) setFormError(describeError?.(error) ?? error.userMessage)
    }
  })

  const onKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape' && !isSubmitting) {
      event.preventDefault()
      onCancel()
    } else if (event.key === 'Tab') {
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled)') ?? [])
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
        className="admin-dialog"
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
          <div><span>{copy.kicker}</span><h2 id={titleId}>{copy.title(businessName)}</h2></div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onCancel} disabled={isSubmitting}><X size={19} aria-hidden="true" /></button>
        </div>
        <div className="modal-body">
          <p className="admin-dialog-intro" id={introId}>{copy.intro}</p>
          <TextareaField
            label={copy.label}
            hint={copy.hint}
            required={kind === 'request-changes'}
            rows={5}
            maxLength={NOTES_MAX}
            error={errors.notes?.message}
            disabled={isSubmitting}
            {...register('notes')}
          />
          {formError && <p className="admin-notice admin-notice-error" role="alert">{formError}</p>}
        </div>
        <div className="modal-footer">
          <button type="button" className="button button-secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
          <button type="submit" className="button button-primary" disabled={isSubmitting}>{isSubmitting ? copy.busy : copy.confirm}</button>
        </div>
      </form>
    </div>
  )
}
