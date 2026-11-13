import { useEffect, useState } from 'react'

import { FormField } from '../../components/forms'
import { majorToMinor, MAX_MINOR, minorToMajor } from '../listings/money'

interface MoneyFieldProps {
  label: string
  /** Integer cents, or `null` when blank. */
  value: number | null
  onChange: (value: number | null) => void
  currency: string
  hint?: string
  className?: string
}

/**
 * An amount typed in dollars and kept in cents. Text that is not an amount stays in the field
 * with an error and is not saved, so a half-typed value never reaches the draft.
 */
export function MoneyField({ label, value, onChange, currency, hint, className }: MoneyFieldProps) {
  const [text, setText] = useState(() => minorToMajor(value))
  const parsed = majorToMinor(text)

  // A change from outside (a cash adjustment pre-filled, a reload) replaces the text.
  useEffect(() => {
    setText((current) => (majorToMinor(current) === value ? current : minorToMajor(value)))
  }, [value])

  return (
    <FormField
      label={label}
      hint={hint}
      error={parsed === undefined ? `Enter an amount in ${currency}, up to ${minorToMajor(MAX_MINOR)}, with at most two decimals.` : undefined}
      className={className}
    >
      {(a11y) => (
        <div className="proposal-money">
          <span aria-hidden="true">{currency === 'USD' ? '$' : currency}</span>
          <input
            className="form-field-control"
            inputMode="decimal"
            value={text}
            onChange={(event) => {
              setText(event.target.value)
              const next = majorToMinor(event.target.value)
              if (next !== undefined) onChange(next)
            }}
            {...a11y}
          />
        </div>
      )}
    </FormField>
  )
}

interface DaysFieldProps {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  /** The draft limit: larger numbers are refused as they are typed. */
  max: number
  hint?: string
  suffix?: string
  className?: string
}

/** A whole number such as a number of days. Blank is `null`. */
export function WholeNumberField({ label, value, onChange, max, hint, suffix, className }: DaysFieldProps) {
  const [text, setText] = useState(() => (value === null ? '' : String(value)))
  const valid = text.trim() === '' || (/^\d+$/.test(text.trim()) && Number(text) <= max)

  useEffect(() => {
    setText((current) => {
      const currentValue = current.trim() === '' ? null : Number(current)
      return currentValue === value ? current : value === null ? '' : String(value)
    })
  }, [value])

  return (
    <FormField label={label} hint={hint} error={valid ? undefined : `Enter a whole number from 0 to ${max}.`} className={className}>
      {(a11y) => (
        <div className="proposal-number">
          <input
            className="form-field-control"
            inputMode="numeric"
            value={text}
            onChange={(event) => {
              const next = event.target.value
              setText(next)
              const trimmed = next.trim()
              if (trimmed === '') onChange(null)
              else if (/^\d+$/.test(trimmed) && Number(trimmed) <= max) onChange(Number(trimmed))
            }}
            {...a11y}
          />
          {suffix && <span aria-hidden="true">{suffix}</span>}
        </div>
      )}
    </FormField>
  )
}
