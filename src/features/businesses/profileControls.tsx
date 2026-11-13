import { useId, type ComponentPropsWithRef } from 'react'

// Inputs in the prototype's profile look: the label wraps its control and names it.

export type FieldProps = { label: string; hint?: string; error?: string; className?: string }

function useControlIds(hint?: string, error?: string) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  return { labelId: `${id}-label`, hintId, errorId, describedBy: [hintId, errorId].filter(Boolean).join(' ') || undefined }
}

export function Field({ label, hint, error, className, ...props }: FieldProps & ComponentPropsWithRef<'input'>) {
  const { labelId, hintId, errorId, describedBy } = useControlIds(hint, error)
  return (
    <label className={className}>
      <span id={labelId}>{label}</span>
      <input {...props} aria-labelledby={labelId} aria-invalid={Boolean(error)} aria-describedby={describedBy} />
      {hint ? <small className="profile-field-hint" id={hintId}>{hint}</small> : null}
      {error ? <small className="profile-field-error" id={errorId}>{error}</small> : null}
    </label>
  )
}

export function TextArea({ label, hint, error, className, ...props }: FieldProps & ComponentPropsWithRef<'textarea'>) {
  const { labelId, hintId, errorId, describedBy } = useControlIds(hint, error)
  return (
    <label className={className}>
      <span id={labelId}>{label}</span>
      <textarea {...props} aria-labelledby={labelId} aria-invalid={Boolean(error)} aria-describedby={describedBy} />
      {hint ? <small className="profile-field-hint" id={hintId}>{hint}</small> : null}
      {error ? <small className="profile-field-error" id={errorId}>{error}</small> : null}
    </label>
  )
}

export type SelectProps = FieldProps & ComponentPropsWithRef<'select'> & { placeholder: string; options: ReadonlyArray<{ value: string; label: string }> }

export function Select({ label, error, className, placeholder, options, hint: _hint, ...props }: SelectProps) {
  const { labelId, errorId, describedBy } = useControlIds(undefined, error)
  return (
    <label className={className}>
      <span id={labelId}>{label}</span>
      <select {...props} aria-labelledby={labelId} aria-invalid={Boolean(error)} aria-describedby={describedBy}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {error ? <small className="profile-field-error" id={errorId}>{error}</small> : null}
    </label>
  )
}
