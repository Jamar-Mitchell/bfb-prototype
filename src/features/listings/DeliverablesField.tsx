import { Plus, X } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'

import { FormField } from '../../components/forms'
import { MAX_DELIVERABLE_LENGTH, MAX_DELIVERABLES } from './listingForm'

interface DeliverablesFieldProps {
  value: string[]
  onChange: (value: string[]) => void
  error?: string
  hint?: string
}

/** A list of short deliverables: type one, add it, remove any. Enter adds instead of submitting the form. */
export function DeliverablesField({ value, onChange, error, hint }: DeliverablesFieldProps) {
  const [draft, setDraft] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const full = value.length >= MAX_DELIVERABLES

  const add = () => {
    const item = draft.trim()
    if (!item) return
    if (item.length > MAX_DELIVERABLE_LENGTH) {
      setProblem(`Keep each deliverable to ${MAX_DELIVERABLE_LENGTH} characters.`)
      return
    }
    if (value.some((existing) => existing.toLowerCase() === item.toLowerCase())) {
      setProblem('That deliverable is already on the list.')
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
        label="Deliverables"
        hint={full ? `That’s the limit of ${MAX_DELIVERABLES}.` : hint}
        error={problem ?? error}
      >
        {(a11y) => (
          <div className="listing-deliverable-add">
            <input
              className="form-field-control"
              value={draft}
              disabled={full}
              placeholder="e.g. Brand guidelines"
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
        <ul className="listing-deliverable-list" aria-label="Deliverables added">
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
