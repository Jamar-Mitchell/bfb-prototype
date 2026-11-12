import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'react-router-dom'
import { z } from 'zod'

import { paths } from '../../app/router/paths'
import { TextField } from '../../components/forms'
import { toApiError } from '../../lib/api/errors'
import { AuthLayout, AuthMessage } from './AuthLayout'
import { requestPasswordReset } from './authApi'

const forgotSchema = z.object({ email: z.email('Enter a valid email address.') })

type ForgotValues = z.infer<typeof forgotSchema>

/** Router state other pages pass to the forgot-password page. */
export interface ForgotPasswordLocationState {
  /** Prefill the email, e.g. with what the user typed on the login page. */
  email?: string
}

/** Ask for a password reset link. The API answers the same whether or not the address is registered. */
export function ForgotPasswordPage() {
  const location = useLocation()
  const state = (location.state ?? {}) as ForgotPasswordLocationState
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: state.email ?? '' },
  })

  const submit = handleSubmit(async ({ email }) => {
    setFormError(null)
    try {
      await requestPasswordReset(email)
      setSentTo(email)
    } catch (error) {
      setFormError(toApiError(error).userMessage)
    }
  })

  if (sentTo) {
    return (
      <AuthLayout kicker="RESET PASSWORD" title="Check your email" intro="The link works for 60 minutes. Requesting another one replaces it.">
        <AuthMessage tone="success">If an account uses {sentTo}, we’ve emailed it a link to reset the password.</AuthMessage>
        <Link to={paths.login} state={{ email: sentTo }} className="button button-primary button-large auth-submit">
          Back to log in <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <p className="auth-switch">
          No email? Check your spam folder or{' '}
          <button type="button" className="auth-inline-button" onClick={() => setSentTo(null)}>send another link</button>.
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout kicker="RESET PASSWORD" title="Forgot your password?" intro="Enter the email you use for BFB and we’ll send you a link to choose a new password.">
      {formError ? <AuthMessage tone="error">{formError}</AuthMessage> : null}
      <form className="auth-form" onSubmit={submit} noValidate>
        <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <button type="submit" className="button button-primary button-large auth-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sending link…' : <>Send reset link <ArrowRight size={18} aria-hidden="true" /></>}
        </button>
      </form>
      <p className="auth-switch">Remembered it? <Link to={paths.login}>Log in</Link></p>
    </AuthLayout>
  )
}
