import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { paths } from '../../app/router/paths'
import { useAppNavigate } from '../../app/router/useAppNavigate'
import { LoadingState } from '../../components/feedback'
import { TextField } from '../../components/forms'
import { toApiError } from '../../lib/api/errors'
import { refreshAccount } from '../../lib/auth/session'
import { useSessionStore } from '../../stores/session'
import { AuthLayout, AuthMessage } from './AuthLayout'
import { resendVerification, verifyEmail } from './authApi'
import { ResendVerificationButton } from './ResendVerificationButton'

type Outcome =
  | { kind: 'verifying' }
  | { kind: 'verified' }
  | { kind: 'already-verified' }
  | { kind: 'expired' }
  | { kind: 'invalid' }
  | { kind: 'error'; message: string }

/** Pick up `email_verified` for a logged-in user. A failure only delays the banner going away. */
async function refreshAccountQuietly() {
  try {
    await refreshAccount()
  } catch {
    // The user can still continue; the next session restore loads the account again.
  }
}

async function runVerification(token: string): Promise<Outcome> {
  try {
    await verifyEmail(token)
    await refreshAccountQuietly()
    return { kind: 'verified' }
  } catch (error) {
    const apiError = toApiError(error)
    if (apiError.code === 'verification_token_expired') return { kind: 'expired' }
    if (apiError.code === 'invalid_verification_token') {
      // The link may simply have been used already: a logged-in user can tell from their account.
      await refreshAccountQuietly()
      return useSessionStore.getState().user?.emailVerified ? { kind: 'already-verified' } : { kind: 'invalid' }
    }
    return { kind: 'error', message: apiError.userMessage }
  }
}

/**
 * Handles the link in the verification email (`#/verify-email?token=…`). Works logged in
 * or not, since the link may be opened in another browser.
 */
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; outcome: Outcome } | null>(null)
  const key = `${token}#${attempt}`

  useEffect(() => {
    if (!token) return
    let live = true
    void runVerification(token).then((outcome) => {
      if (live) setResult({ key, outcome })
    })
    return () => {
      live = false
    }
  }, [token, key])

  const outcome: Outcome = !token ? { kind: 'invalid' } : result?.key === key ? result.outcome : { kind: 'verifying' }

  return <VerifyEmailView outcome={outcome} retry={() => setAttempt((count) => count + 1)} />
}

function VerifyEmailView({ outcome, retry }: { outcome: Outcome; retry: () => void }) {
  const go = useAppNavigate()
  const loggedIn = useSessionStore((state) => state.status === 'authenticated')
  const email = useSessionStore((state) => state.user?.email)

  switch (outcome.kind) {
    case 'verifying':
      return (
        <AuthLayout kicker="VERIFY EMAIL" title="Verifying your email" intro="This only takes a moment.">
          <LoadingState label="Verifying your email…" className="auth-loading" />
        </AuthLayout>
      )

    case 'verified':
    case 'already-verified':
      return (
        <AuthLayout
          kicker="VERIFY EMAIL"
          title={outcome.kind === 'verified' ? 'Your email is verified' : 'Your email is already verified'}
          intro={
            loggedIn
              ? 'Thanks for confirming your address. You can now create your business on BFB.'
              : 'Thanks for confirming your address. Log in to set up your business on BFB.'
          }
        >
          <button
            type="button"
            className="button button-primary button-large auth-submit"
            onClick={() => go(loggedIn ? paths.dashboard : paths.login)}
          >
            {loggedIn ? 'Continue to BFB' : 'Log in'} <ArrowRight size={18} aria-hidden="true" />
          </button>
        </AuthLayout>
      )

    case 'expired':
    case 'invalid':
      return (
        <AuthLayout
          kicker="VERIFY EMAIL"
          title={outcome.kind === 'expired' ? 'This link has expired' : 'This link no longer works'}
          intro={
            outcome.kind === 'expired'
              ? 'Verification links work for 72 hours. Send yourself a new one.'
              : 'It may have been used already or replaced by a newer link. Only the newest link we sent works.'
          }
        >
          {loggedIn ? <ResendVerificationButton email={email} appearance="block" /> : <ResendVerificationForm />}
          {loggedIn ? null : <p className="auth-switch">Already verified? <Link to={paths.login}>Log in</Link></p>}
        </AuthLayout>
      )

    case 'error':
      return (
        <AuthLayout kicker="VERIFY EMAIL" title="We couldn’t verify your email" intro="Your link may still work. Try again in a moment.">
          <AuthMessage tone="error">{outcome.message}</AuthMessage>
          <button type="button" className="button button-primary button-large auth-submit" onClick={retry}>
            Try again
          </button>
        </AuthLayout>
      )
  }
}

const resendSchema = z.object({ email: z.email('Enter a valid email address.') })

type ResendValues = z.infer<typeof resendSchema>

/** For a logged-out visitor: ask which address to send a new link to. */
function ResendVerificationForm() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResendValues>({ resolver: zodResolver(resendSchema), defaultValues: { email: '' } })

  const submit = handleSubmit(async ({ email }) => {
    setFormError(null)
    try {
      await resendVerification(email)
      setSentTo(email)
    } catch (error) {
      setFormError(toApiError(error).userMessage)
    }
  })

  if (sentTo) {
    return <AuthMessage tone="success">If {sentTo} needs verifying, we’ve sent a new link. Check your inbox.</AuthMessage>
  }

  return (
    <>
      {formError ? <AuthMessage tone="error">{formError}</AuthMessage> : null}
      <form className="auth-form" onSubmit={submit} noValidate>
        <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <button type="submit" className="button button-primary button-large auth-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send a new link'}
        </button>
      </form>
    </>
  )
}
