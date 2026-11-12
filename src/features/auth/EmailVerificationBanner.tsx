import { MailWarning } from 'lucide-react'

import { useSessionStore } from '../../stores/session'
import { ResendVerificationButton } from './ResendVerificationButton'
import './EmailVerificationBanner.css'

/** App-shell banner for a logged-in user who has not verified their email address yet. */
export function EmailVerificationBanner() {
  const user = useSessionStore((state) => state.user)

  if (!user || user.emailVerified !== false) return null

  return (
    <section className="verify-banner" aria-label="Verify your email address">
      <span className="verify-banner-icon"><MailWarning size={18} aria-hidden="true" /></span>
      <p className="verify-banner-text">
        <strong>Verify your email address.</strong> We sent a link to {user.email}. You need it to create a business.
      </p>
      <ResendVerificationButton email={user.email} />
    </section>
  )
}
