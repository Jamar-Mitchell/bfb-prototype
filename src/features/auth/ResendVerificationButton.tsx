import { useResendVerification } from './useResendVerification'
import './ResendVerification.css'

interface ResendVerificationButtonProps {
  /** Where to send the link: the logged-in user's address. */
  email: string | undefined
  /** `inline` sits in a sentence or banner; `block` is a full-width auth-page button. */
  appearance?: 'inline' | 'block'
}

/** "Resend email" for a logged-in user whose address is not verified yet, with the sent confirmation. */
export function ResendVerificationButton({ email, appearance = 'inline' }: ResendVerificationButtonProps) {
  const { send, status, error, disabled } = useResendVerification(email)
  const label = status === 'sending' ? 'Sending…' : status === 'sent' && disabled ? 'Email sent' : 'Resend email'

  return (
    <span className={`resend-verification resend-verification-${appearance}`}>
      <button
        type="button"
        className={appearance === 'block' ? 'button button-primary button-large auth-submit' : 'resend-verification-button'}
        onClick={() => void send()}
        disabled={disabled}
      >
        {label}
      </button>
      <span className="resend-verification-feedback" role="status">
        {status !== 'sent' ? null : appearance === 'block' ? `We sent a new link to ${email}. Check your inbox.` : 'New link sent. Check your inbox.'}
      </span>
      {error ? <span className="resend-verification-error" role="alert">{error}</span> : null}
    </span>
  )
}
