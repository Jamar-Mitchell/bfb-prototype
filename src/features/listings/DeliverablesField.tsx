import { Plus, X } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'

import { FormField } from '../../components/forms'
import { MAX_DELIVERABLE_LENGTH, MAX_DELIVERABLES } from './listingForm'

interface DeliverablesFieldProps {
  value: string[]
  onChange: (value: string[]) => void
  error?: string
  hint?: string
  /** Defaults suit listings; the proposal builder also uses it for exclusions. */
  label?: string
  placeholder?: string
  /** What one item is called in messages, e.g. "deliverable" or "exclusion". */
  noun?: string
  max?: number
}

/** A list of short items such as deliverables: type one, add it, remove any. Enter adds instead of submitting the form. */
export function DeliverablesField({ value, onChange, error, hint, label = 'Deliverables', placeholder = 'e.g. Brand guidelines', noun = 'deliverable', max = MAX_DELIVERABLES }: DeliverablesFieldProps) {
  const [draft, setDraft] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const full = value.length >= max

  const add = () => {
    const item = draft.trim()
    if (!item) return
    if (item.length > MAX_DELIVERABLE_LENGTH) {
      setProblem(`Keep each ${noun} to ${MAX_DELIVERABLE_LENGTH} characters.`)
      return
    }
    if (value.some((existing) => existing.toLowerCase() === item.toLowerCase())) {
      setProblem(`That ${noun} is already on the list.`)
      return
    }
    onChange([...value, item])
    setDraft('')
    setProblem(null)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      add()
    }
  }

  return (
    <div className="form-full listing-deliverables">
      <FormField
        label={label}
        hint={full ? `That’s the limit of ${max}.` : hint}
        error={problem ?? error}
      >
        {(a11y) => (
          <div className="listing-deliverable-add">
            <input
              className="form-field-control"
              value={draft}
              disabled={full}
              placeholder={placeholder}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              {...a11y}
            />
            <button type="button" className="button button-secondary button-small" onClick={add} disabled={full || !draft.trim()}>
              <Plus size={15} aria-hidden="true" /> Add
            </button>
          </div>
        )}
      </FormField>
      {value.length > 0 ? (
        <ul className="listing-deliverable-list" aria-label={`${label} added`}>
          {value.map((item, index) => (
            <li key={`${item}-${index}`}>
              <span>{item}</span>
              <button type="button" aria-label={`Remove ${item}`} onClick={() => onChange(value.filter((_, at) => at !== index))}>
                <X size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
