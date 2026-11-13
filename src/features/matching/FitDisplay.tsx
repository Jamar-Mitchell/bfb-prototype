import { Check, CircleHelp, Minus, X } from 'lucide-react'

import { describeFactor, FIT_BAND_DESCRIPTIONS, fitBandLabel, type FactorOutcome, type FactorResult, type FitBand } from './fitCopy'
import './FitDisplay.css'

/** The fit band in words, never a number. */
export function FitBandBadge({ band }: { band: string }) {
  return (
    <span className={`fit-band fit-band-${band}`} title={FIT_BAND_DESCRIPTIONS[band as FitBand]}>
      {fitBandLabel(band)}
    </span>
  )
}

const OUTCOME_ICONS: Record<FactorOutcome, typeof Check> = { fits: Check, partial: Minus, conflict: X, unknown: CircleHelp }

/** Each factor's result and the reason behind it, in the API's order. */
export function FactorList({ factors, label }: { factors: FactorResult[]; label?: string }) {
  return (
    <ul className="fit-factors" aria-label={label}>
      {factors.map((factor) => {
        const copy = describeFactor(factor)
        const Icon = OUTCOME_ICONS[copy.outcome]
        return (
          <li key={factor.factor} className={`fit-factor fit-factor-${copy.outcome}`}>
            <span className="fit-factor-icon" aria-hidden="true"><Icon size={12} strokeWidth={3} /></span>
            <span className="fit-factor-text">
              <strong>{copy.label}</strong>
              <span className="fit-factor-outcome">{copy.outcomeLabel}</span>
              <span className="fit-factor-reason">{copy.reason}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
