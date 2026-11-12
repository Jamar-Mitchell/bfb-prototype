import { useId, type ReactNode } from 'react'

import './FormField.css'

export interface FieldA11yProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby'?: string
}

interface FormFieldProps {
  label: ReactNode
  hint?: ReactNode
  error?: string
  /** Use the caller's id instead of a generated one. */
  id?: string
  required?: boolean
  className?: string
  children: (control: FieldA11yProps) => ReactNode
}

/** Label, hint and error text around a single control, with the ids wired for screen readers. */
export function FormField({ label, hint, error, id, required, className, children }: FormFieldProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={['form-field', error ? 'form-field-invalid' : '', className ?? ''].filter(Boolean).join(' ')}>
      <label className="form-field-label" htmlFor={controlId}>
        {label}
        {required ? <span className="form-field-required" aria-hidden="true"> *</span> : null}
      </label>
      {children({ id: controlId, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {hint ? <p className="form-field-hint" id={hintId}>{hint}</p> : null}
      {error ? <p className="form-field-error" id={errorId}>{error}</p> : null}
    </div>
  )
}
