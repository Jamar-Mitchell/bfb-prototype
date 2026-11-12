import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { paths } from '../../app/router/paths'
import { useAppNavigate } from '../../app/router/useAppNavigate'
import { ErrorState, LoadingState, showToast } from '../../components/feedback'
import { toApiError } from '../../lib/api/errors'
import { logout, refreshAccount, restoreSession } from '../../lib/auth/session'
import { addBusiness, businessToSessionBusiness, loadMemberships } from '../../lib/businesses/activeBusiness'
import { useSessionStore } from '../../stores/session'
import { AuthLayout, AuthMessage } from '../auth/AuthLayout'
import type { LoginLocationState } from '../auth/LoginPage'
import { ResendVerificationButton } from '../auth/ResendVerificationButton'
import '../../app/router/RequireAuth.css'
import { acceptInvitation } from './teamApi'

type Outcome =
  | { kind: 'accepting' }
  | { kind: 'accepted' }
  | { kind: 'not-verified' }
  | { kind: 'mismatch' }
  | { kind: 'expired' }
  | { kind: 'invalid' }
  | { kind: 'already-member' }
  | { kind: 'error'; message: string }

async function runAccept(token: string, userId: string): Promise<Outcome> {
  try {
    const business = await acceptInvitation(token, userId)
    // Switch to the business just joined, then pick up the full list for the switcher.
    addBusiness(businessToSessionBusiness(business))
    void loadMemberships()
    showToast(`You joined ${business.display_name}.`)
    return { kind: 'accepted' }
  } catch (error) {
    const apiError = toApiError(error)
    switch (apiError.code) {
      case 'email_not_verified':
        return { kind: 'not-verified' }
      case 'invitation_email_mismatch':
        return { kind: 'mismatch' }
      case 'invitation_expired':
        return { kind: 'expired' }
      case 'invalid_invitation_token':
        return { kind: 'invalid' }
      case 'already_business_member':
        void loadMemberships()
        return { kind: 'already-member' }
      default:
        return { kind: 'error', message: apiError.userMessage }
    }
  }
}

/**
 * Handles the link in an invitation email (`#/accept-invite?token=…`). A logged-out visitor
 * is sent to log in or register and comes back here with the token; a logged-in one accepts
 * right away and lands on the dashboard of the business they joined.
 */
export function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const status = useSessionStore((state) => state.status)
  const restoreError = useSessionStore((state) => state.restoreError)
  const userId = useSessionStore((state) => (state.status === 'authenticated' ? state.user?.id : undefined))
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; outcome: Outcome } | null>(null)
  const key = `${token}#${userId ?? ''}#${attempt}`
  const navigate = useNavigate()

  useEffect(() => {
    if (!token || !userId) return
    let live = true
    void runAccept(token, userId).then((outcome) => {
      if (!live) return
      setResult({ key, outcome })
      if (outcome.kind === 'accepted') {
        navigate(paths.dashboard, { replace: true })
        window.scrollTo(0, 0)
      }
    })
    return () => {
      live = false
    }
  }, [token, userId, key, navigate])

  const retry = () => setAttempt((count) => count + 1)

  if (!token) return <AcceptInviteView outcome={{ kind: 'invalid' }} retry={retry} />

  if (status === 'anonymous') return <LoggedOutView token={token} />

  if (status === 'error') {
    return (
      <div className="session-gate">
        <ErrorState title="We couldn’t load your account" error={restoreError} onRetry={() => void restoreSession()} />
      </div>
    )
  }

  const outcome: Outcome = status === 'authenticated' && result?.key === key ? result.outcome : { kind: 'accepting' }
  return <AcceptInviteView outcome={outcome} retry={retry} />
}

function LoggedOutView({ token }: { token: string }) {
  const go = useNavigate()
  // Login and registration bring the user back here, so the token is not lost.
  const state: LoginLocationState = { from: `${paths.acceptInvite}?token=${encodeURIComponent(token)}` }

  return (
    <AuthLayout
      kicker="TEAM INVITATION"
      title="You’ve been invited to a business on BFB"
      intro="Log in or create an account with the email address the invitation was sent to. We’ll bring you back here to accept it."
    >
      <button type="button" className="button button-primary button-large auth-submit" onClick={() => go(paths.login, { state })}>
        Log in to accept <ArrowRight size={18} aria-hidden="true" />
      </button>
      <p className="auth-switch">New to BFB? <Link to={paths.register} state={state}>Create an account</Link></p>
    </AuthLayout>
  )
}

function AcceptInviteView({ outcome, retry }: { outcome: Outcome; retry: () => void }) {
  const go = useAppNavigate()
  const email = useSessionStore((state) => state.user?.email)
  const loggedIn = useSessionStore((state) => state.status === 'authenticated')
  const [checking, setChecking] = useState(false)

  const continueButton = (label = 'Continue to BFB') => (
    <button type="button" className="button button-primary button-large auth-submit" onClick={() => go(loggedIn ? paths.dashboard : paths.login)}>
      {label} <ArrowRight size={18} aria-hidden="true" />
    </button>
  )

  switch (outcome.kind) {
    case 'accepting':
    case 'accepted':
      return (
        <AuthLayout kicker="TEAM INVITATION" title="Joining the business" intro="This only takes a moment.">
          <LoadingState label="Accepting your invitation…" className="auth-loading" />
        </AuthLayout>
      )

    case 'not-verified': {
      // After verifying (maybe in another tab), reload the account so the retry is not refused again.
      const checkAgain = async () => {
        setChecking(true)
        try {
          await refreshAccount()
        } catch {
          // The retry below reports any problem.
        } finally {
          setChecking(false)
          retry()
        }
      }
      return (
        <AuthLayout
          kicker="TEAM INVITATION"
          title="Verify your email to join"
          intro={`Open the verification link we sent to ${email ?? 'your email address'}, then come back here to accept the invitation.`}
        >
          <ResendVerificationButton email={email} appearance="block" />
          <p className="auth-switch">
            Verified already?{' '}
            <button type="button" className="auth-inline-button" onClick={() => void checkAgain()} disabled={checking}>
              {checking ? 'Checking…' : 'Accept the invitation'}
            </button>
          </p>
        </AuthLayout>
      )
    }

    case 'mismatch':
      return (
        <AuthLayout
          kicker="TEAM INVITATION"
          title="This invitation is for another email address"
          intro={`You’re logged in as ${email ?? 'a different address'}. Log out, then log in or create an account with the address the invitation was sent to and open the link again.`}
        >
          <button type="button" className="button button-primary button-large auth-submit" onClick={() => void logout()}>
            Log out and switch account
          </button>
          <p className="auth-switch"><Link to={paths.dashboard}>Back to my dashboard</Link></p>
        </AuthLayout>
      )

    case 'expired':
      return (
        <AuthLayout
          kicker="TEAM INVITATION"
          title="This invitation has expired"
          intro="Invitations work for 7 days. Ask the person who invited you to send a new one."
        >
          {continueButton()}
        </AuthLayout>
      )

    case 'invalid':
      return (
        <AuthLayout
          kicker="TEAM INVITATION"
          title="This invitation link no longer works"
          intro="It may have been used already, withdrawn, or replaced by a newer invitation. Only the newest link we sent works."
        >
          {continueButton()}
        </AuthLayout>
      )

    case 'already-member':
      return (
        <AuthLayout
          kicker="TEAM INVITATION"
          title="You’re already in this business"
          intro="Your account is already a member of the business that invited you. Switch to it from the business menu."
        >
          {continueButton('Go to my dashboard')}
        </AuthLayout>
      )

    case 'error':
      return (
        <AuthLayout kicker="TEAM INVITATION" title="We couldn’t accept your invitation" intro="Your link may still work. Try again in a moment.">
          <AuthMessage tone="error">{outcome.message}</AuthMessage>
          <button type="button" className="button button-primary button-large auth-submit" onClick={retry}>
            Try again
          </button>
        </AuthLayout>
      )
  }
}
