import type { ComponentPropsWithRef, ReactNode } from 'react'

import { FormField } from './FormField'

interface SharedFieldProps {
  label: ReactNode
  hint?: ReactNode
  /** Error text, usually `formState.errors.<name>?.message`. */
  error?: string
  /** Class for the wrapper, e.g. `form-full` to span a grid row. */
  className?: string
}

export type TextFieldProps = SharedFieldProps & Omit<ComponentPropsWithRef<'input'>, 'className'>

/** Text input with label, hint and error. Spread `register('name')` onto it. */
export function TextField({ label, hint, error, className, id, required, type = 'text', ...inputProps }: TextFieldProps) {
  return (
    <FormField label={label} hint={hint} error={error} id={id} required={required} className={className}>
      {(a11y) => <input className="form-field-control" type={type} aria-required={required || undefined} {...inputProps} {...a11y} />}
    </FormField>
  )
}

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export type SelectFieldProps = SharedFieldProps &
  Omit<ComponentPropsWithRef<'select'>, 'className' | 'children'> & {
    options: readonly SelectOption[]
    /** Text for an empty first option, e.g. "Choose a category". */
    placeholder?: string
  }

export function SelectField({ label, hint, error, className, id, required, options, placeholder, ...selectProps }: SelectFieldProps) {
  return (
    <FormField label={label} hint={hint} error={error} id={id} required={required} className={className}>
      {(a11y) => (
        <select className="form-field-control" aria-required={required || undefined} {...selectProps} {...a11y}>
          {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>
          ))}
        </select>
      )}
    </FormField>
  )
}

export type TextareaFieldProps = SharedFieldProps & Omit<ComponentPropsWithRef<'textarea'>, 'className'>

export function TextareaField({ label, hint, error, className, id, required, ...textareaProps }: TextareaFieldProps) {
  return (
    <FormField label={label} hint={hint} error={error} id={id} required={required} className={className}>
      {(a11y) => <textarea className="form-field-control form-field-textarea" aria-required={required || undefined} {...textareaProps} {...a11y} />}
    </FormField>
  )
}
