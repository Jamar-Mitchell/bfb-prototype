import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { TextareaField } from '../../components/forms'
import { toApiError, type ApiError } from '../../lib/api/errors'
import { applyApiFieldErrors } from '../../lib/forms/applyApiFieldErrors'

export const NOTES_MAX = 2000

export interface NotesDialogCopy {
  kicker: string
  title: string
  intro: string
  label: string
  hint: string
  confirm: string
  busy: string
  /** Set when notes are required: the message shown for empty notes. */
  requiredMessage?: string
}

interface NotesDialogProps {
  copy: NotesDialogCopy
  /** The API's name for the notes field, so its field errors land on the textarea. */
  field?: string
  /** Sends the action. Throws on failure; the dialog shows the error and stays open. */
  onSubmit: (notes: string) => Promise<void>
  onCancel: () => void
  /** Copy for a refused action, when the default message for its code is not enough. */
  describeError?: (error: ApiError) => string | undefined
}

type NotesForm = { notes: string }

const tooLong = `Keep notes under ${NOTES_MAX.toLocaleString('en-US')} characters.`

/**
 * Confirms an admin action that takes a note: approve, request changes, withdraw a match.
 * Built from the prototype's modal. Focus starts in the notes field, Escape cancels, and
 * Tab stays inside.
 */
export function NotesDialog({ copy, field = 'notes', onSubmit, onCancel, describeError }: NotesDialogProps) {
  const titleId = useId()
  const introId = useId()
  const dialogRef = useRef<HTMLFormElement>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const schema = useMemo(
    () =>
      z.object({
        notes: copy.requiredMessage
          ? z.string().trim().min(1, copy.requiredMessage).max(NOTES_MAX, tooLong)
          : z.string().trim().max(NOTES_MAX, tooLong),
      }),
    [copy.requiredMessage],
  )
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<NotesForm>({ resolver: zodResolver(schema), defaultValues: { notes: '' } })

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
      const unmatched = applyApiFieldErrors<NotesForm>(error, setError, { knownFields: ['notes'], fieldMap: { [field]: 'notes' } })
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
          <div><span>{copy.kicker}</span><h2 id={titleId}>{copy.title}</h2></div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onCancel} disabled={isSubmitting}><X size={19} aria-hidden="true" /></button>
        </div>
        <div className="modal-body">
          <p className="admin-dialog-intro" id={introId}>{copy.intro}</p>
          <TextareaField
            label={copy.label}
            hint={copy.hint}
            required={Boolean(copy.requiredMessage)}
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
