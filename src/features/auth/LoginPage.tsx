import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { z } from 'zod'

import { paths } from '../../app/router/paths'
import { TextField } from '../../components/forms'
import { toApiError } from '../../lib/api/errors'
import { applyApiFieldErrors } from '../../lib/forms/applyApiFieldErrors'
import { useSessionStore } from '../../stores/session'
import { AuthLayout, AuthMessage } from './AuthLayout'
import { login } from './authApi'

const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

type LoginValues = z.infer<typeof loginSchema>

/** Router state other pages pass to the login page. */
export interface LoginLocationState {
  /** Where to go after logging in. Defaults to the dashboard. */
  from?: string
  /** Just registered: show a confirmation and prefill the email. */
  registered?: boolean
  email?: string
  /** Why the user is here, when they did not choose to come. */
  reason?: 'expired' | 'logged-out'
}

function noticeFor(state: LoginLocationState) {
  if (state.registered) return { tone: 'success' as const, text: 'Your account was created. Log in to continue.' }
  if (state.reason === 'expired') return { tone: 'info' as const, text: 'Your session has ended. Log in again to continue.' }
  if (state.reason === 'logged-out') return { tone: 'info' as const, text: 'You have logged out.' }
  return null
}

export function LoginPage() {
  const location = useLocation()
  const isAuthenticated = useSessionStore((session) => session.status === 'authenticated')
  const state = (location.state ?? {}) as LoginLocationState
  const notice = noticeFor(state)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: state.email ?? '', password: '' },
  })

  const submit = handleSubmit(async (values) => {
    setFormError(null)

    try {
      // Logging in authenticates the session store; the redirect below takes it from there.
      await login(values)
      window.scrollTo(0, 0)
    } catch (error) {
      const apiError = toApiError(error)
      const unmatched = applyApiFieldErrors(apiError, setError, { knownFields: ['email', 'password'] })

      if (apiError.fieldErrors.length === 0 || unmatched.length > 0) {
        setFormError(apiError.userMessage)
      }
    }
  })

  if (isAuthenticated) return <Navigate to={state.from ?? paths.dashboard} replace />

  return (
    <AuthLayout kicker="WELCOME BACK" title="Log in to BFB" intro="Pick up where you left off with your business exchanges.">
      {formError ? <AuthMessage tone="error">{formError}</AuthMessage> : notice ? <AuthMessage tone={notice.tone}>{notice.text}</AuthMessage> : null}
      <form className="auth-form" onSubmit={submit} noValidate>
        <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <TextField label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
        <button type="submit" className="button button-primary button-large auth-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in…' : <>Log in <ArrowRight size={18} aria-hidden="true" /></>}
        </button>
      </form>
      <p className="auth-switch">New to BFB? <Link to={paths.register} state={state.from ? { from: state.from } : undefined}>Create an account</Link></p>
    </AuthLayout>
  )
}
