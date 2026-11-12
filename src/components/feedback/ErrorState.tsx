import { TriangleAlert, RotateCw } from 'lucide-react'

import { toApiError } from '../../lib/api/errors'
import './feedback.css'

interface ErrorStateProps {
  /** The thrown error. Its code decides the message; its request ID is shown for support. */
  error?: unknown
  title?: string
  /** Overrides the message derived from `error`. */
  message?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function ErrorState({
  error,
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  const apiError = error === undefined ? undefined : toApiError(error)
  const text = message ?? apiError?.userMessage ?? 'Please try again.'

  return (
    <div className={['feedback-state', 'feedback-error', className].filter(Boolean).join(' ')} role="alert">
      <div className="feedback-icon"><TriangleAlert size={22} aria-hidden="true" /></div>
      <h2>{title}</h2>
      <p>{text}</p>
      {onRetry ? (
        <div className="feedback-action">
          <button type="button" className="button button-secondary button-small" onClick={onRetry}>
            <RotateCw size={15} aria-hidden="true" /> {retryLabel}
          </button>
        </div>
      ) : null}
      {apiError?.requestId ? <small className="feedback-request-id">Reference: {apiError.requestId}</small> : null}
    </div>
  )
}
