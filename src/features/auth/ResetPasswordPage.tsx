import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { paths } from '../../app/router/paths'
import { TextField } from '../../components/forms'
import { toApiError } from '../../lib/api/errors'
import { clearStoredSession } from '../../lib/auth/tokens'
import { applyApiFieldErrors } from '../../lib/forms/applyApiFieldErrors'
import { AuthLayout, AuthMessage } from './AuthLayout'
import { confirmPasswordReset } from './authApi'
import type { LoginLocationState } from './LoginPage'
import { newPasswordSchema, PASSWORD_HINT, passwordMessage } from './passwordRules'

const resetSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Enter the new password again.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The passwords don’t match.',
  })

type ResetValues = z.infer<typeof resetSchema>

type DeadLink = 'expired' | 'invalid'

/** Handles the link in the password reset email (`#/reset-password?token=…`). */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  const [deadLink, setDeadLink] = useState<DeadLink | null>(token ? null : 'invalid')
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const submit = handleSubmit(async ({ password }) => {
    setFormError(null)

    try {
      await confirmPasswordReset(token, password)
      // The API ended every session, so any tokens this browser holds no longer work.
      clearStoredSession()
      const state: LoginLocationState = { passwordReset: true }
      navigate(paths.login, { replace: true, state })
      window.scrollTo(0, 0)
    } catch (error) {
      const apiError = toApiError(error)

      switch (apiError.code) {
        case 'password_reset_token_expired':
          setDeadLink('expired')
          return
        case 'invalid_password_reset_token':
          setDeadLink('invalid')
          return
        case 'weak_password':
          // The link still works: let the user pick another password.
          setError('password', { type: 'server', message: passwordMessage(apiError.details) }, { shouldFocus: true })
          return
      }

      const unmatched = applyApiFieldErrors(apiError, setError, {
        fieldMap: { new_password: 'password' },
        knownFields: ['password'],
      })
      if (apiError.fieldErrors.length === 0 || unmatched.length > 0) {
        setFormError(apiError.userMessage)
      }
    }
  })

  if (deadLink) {
    return (
      <AuthLayout
        kicker="RESET PASSWORD"
        title={deadLink === 'expired' ? 'This link has expired' : 'This link no longer works'}
        intro={
          deadLink === 'expired'
            ? 'Reset links work for 60 minutes. Request a new one to choose your password.'
            : 'It may have been used already or replaced by a newer link. Request a new one to choose your password.'
        }
      >
        <Link to={paths.forgotPassword} className="button button-primary button-large auth-submit">
          Request a new link <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <p className="auth-switch">Remembered it? <Link to={paths.login}>Log in</Link></p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout kicker="RESET PASSWORD" title="Choose a new password" intro="Setting a new password logs you out of BFB on every device.">
      {formError ? <AuthMessage tone="error">{formError}</AuthMessage> : null}
      <form className="auth-form" onSubmit={submit} noValidate>
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          hint={PASSWORD_HINT}
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <button type="submit" className="button button-primary button-large auth-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving password…' : <>Set new password <ArrowRight size={18} aria-hidden="true" /></>}
        </button>
      </form>
    </AuthLayout>
  )
}
