import { LoaderCircle } from 'lucide-react'

import './feedback.css'

interface LoadingStateProps {
  /** Announced to screen readers and shown under the spinner. */
  label?: string
  className?: string
}

export function LoadingState({ label = 'Loading…', className }: LoadingStateProps) {
  return (
    <div className={['feedback-state', 'feedback-loading', className].filter(Boolean).join(' ')} role="status" aria-live="polite">
      <LoaderCircle className="feedback-spinner" size={26} aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}
