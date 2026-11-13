import { useState, type FormEvent, type ReactNode } from 'react'

import { majorToMinor } from '../listings/money'
import { deliveryOptionsFor, type Delivery, type MarketplaceFilters } from './marketplaceFilters'

function Panel({ label, onSubmit, onClear, children }: { label: string; onSubmit: () => void; onClear: () => void; children: ReactNode }) {
  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
  }
  return (
    <form className="market-filter-panel" aria-label={label} onSubmit={submit} noValidate>
      <div className="market-filter-fields">{children}</div>
      <div className="market-filter-actions">
        <button type="button" className="button button-secondary button-small" onClick={onClear}>Clear</button>
        <button type="submit" className="button button-primary button-small">Apply</button>
      </div>
    </form>
  )
}

type PanelProps = {
  filters: MarketplaceFilters
  onApply: (patch: Partial<MarketplaceFilters>) => void
}

/** Country, region and delivery. Applied together, so one change makes one request. */
export function LocationPanel({ filters, onApply }: PanelProps) {
  const [country, setCountry] = useState(filters.country)
  const [region, setRegion] = useState(filters.region)
  const [delivery, setDelivery] = useState<Delivery[]>(filters.delivery)
  const [error, setError] = useState<string | null>(null)
  const options = deliveryOptionsFor(filters.kind)

  function apply() {
    const code = country.trim()
    if (code && !/^[A-Za-z]{2}$/.test(code)) {
      setError('Use a two-letter country code, such as US.')
      return
    }
    onApply({ country: code.toUpperCase(), region: region.trim(), delivery })
  }

  function toggle(value: Delivery) {
    setDelivery((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]))
  }

  return (
    <Panel label="Location filters" onSubmit={apply} onClear={() => onApply({ country: '', region: '', delivery: [] })}>
      <label className="market-filter-field">
        <span>Country</span>
        <input
          value={country}
          onChange={(event) => { setCountry(event.target.value); setError(null) }}
          placeholder="US"
          maxLength={2}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'market-country-error' : undefined}
        />
        {error && <small id="market-country-error" className="market-filter-error" role="alert">{error}</small>}
      </label>
      <label className="market-filter-field">
        <span>State or region</span>
        <input value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Michigan" />
      </label>
      <fieldset className="market-filter-field market-filter-delivery">
        <legend>Delivery</legend>
        <div>
          {options.map((option) => (
            <label key={option.value}>
              <input type="checkbox" checked={delivery.includes(option.value)} onChange={() => toggle(option.value)} /> {option.label}
            </label>
          ))}
        </div>
      </fieldset>
    </Panel>
  )
}

/** An optional value range in dollars. A listing matches when its range overlaps this one. */
export function ValuePanel({ filters, onApply }: PanelProps) {
  const [min, setMin] = useState(filters.valueMin)
  const [max, setMax] = useState(filters.valueMax)
  const [error, setError] = useState<string | null>(null)

  function apply() {
    const minMinor = majorToMinor(min)
    const maxMinor = majorToMinor(max)
    if (minMinor === undefined || maxMinor === undefined) {
      setError('Enter amounts in dollars, such as 1500.')
      return
    }
    if (minMinor !== null && maxMinor !== null && maxMinor < minMinor) {
      setError('The maximum can’t be below the minimum.')
      return
    }
    onApply({ valueMin: min.trim(), valueMax: max.trim() })
  }

  return (
    <Panel label="Value filters" onSubmit={apply} onClear={() => onApply({ valueMin: '', valueMax: '' })}>
      <label className="market-filter-field">
        <span>Minimum ($)</span>
        <input inputMode="decimal" value={min} onChange={(event) => { setMin(event.target.value); setError(null) }} placeholder="500" />
      </label>
      <label className="market-filter-field">
        <span>Maximum ($)</span>
        <input inputMode="decimal" value={max} onChange={(event) => { setMax(event.target.value); setError(null) }} placeholder="5000" />
      </label>
      {error && <small className="market-filter-error market-filter-error-wide" role="alert">{error}</small>}
    </Panel>
  )
}
