import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight } from 'lucide-react'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { paths } from '../../app/router/paths'
import { TextField } from '../../components/forms'
import { toApiError } from '../../lib/api/errors'
import { applyApiFieldErrors } from '../../lib/forms/applyApiFieldErrors'
import { AuthLayout, AuthMessage } from './AuthLayout'
import { register as registerAccount } from './authApi'
import type { LoginLocationState } from './LoginPage'

const PASSWORD_RULES: Record<string, string> = {
  too_short: 'Use at least 10 characters.',
  too_long: 'That password is too long. Use 72 characters or fewer.',
  needs_letter_and_non_letter: 'Mix letters with numbers, spaces or symbols.',
  contains_email: 'Don’t include your email address in your password.',
}

const TERMS_MESSAGE = 'Accept the Terms of Service and Privacy Policy to continue.'

// Mirrors the API's rules (API-1.1) so most mistakes are caught before submitting.
const registerSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter your name.').max(100, 'Use 100 characters or fewer.'),
  email: z.email('Enter a valid email address.'),
  password: z
    .string()
    .min(10, PASSWORD_RULES.too_short)
    .refine((value) => /\p{L}/u.test(value) && /[^\p{L}]/u.test(value), PASSWORD_RULES.needs_letter_and_non_letter),
  acceptTerms: z.boolean().refine((value) => value, TERMS_MESSAGE),
})

type RegisterValues = z.infer<typeof registerSchema>

function passwordMessage(details: unknown): string {
  const rules = (details as { rules?: unknown } | null)?.rules
  const first = Array.isArray(rules) ? rules.find((rule): rule is string => typeof rule === 'string' && rule in PASSWORD_RULES) : undefined
  return first ? PASSWORD_RULES[first] : 'Choose a stronger password.'
}

export function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LoginLocationState | null)?.from
  const termsErrorId = useId()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '', acceptTerms: false },
  })

  const submit = handleSubmit(async (values) => {
    setFormError(null)

    try {
      await registerAccount({
        display_name: values.displayName,
        email: values.email,
        password: values.password,
        accept_terms: values.acceptTerms,
      })
      const state: LoginLocationState = { registered: true, email: values.email, from }
      navigate(paths.login, { state })
      window.scrollTo(0, 0)
    } catch (error) {
      const apiError = toApiError(error)

      switch (apiError.code) {
        case 'email_already_registered':
          setError('email', { type: 'server', message: apiError.userMessage }, { shouldFocus: true })
          return
        case 'weak_password':
          setError('password', { type: 'server', message: passwordMessage(apiError.details) }, { shouldFocus: true })
          return
        case 'terms_not_accepted':
          setError('acceptTerms', { type: 'server', message: TERMS_MESSAGE }, { shouldFocus: true })
          return
      }

      const unmatched = applyApiFieldErrors(apiError, setError, {
        fieldMap: { display_name: 'displayName', accept_terms: 'acceptTerms' },
        knownFields: ['displayName', 'email', 'password', 'acceptTerms'],
      })

      if (apiError.fieldErrors.length === 0 || unmatched.length > 0) {
        setFormError(apiError.userMessage)
      }
    }
  })

  const termsError = errors.acceptTerms?.message

  return (
    <AuthLayout
      kicker="JOIN BFB"
      title="Create your account"
      intro="Start trading what your business does best for what it needs next."
    >
      {formError ? <AuthMessage tone="error">{formError}</AuthMessage> : null}
      <form className="auth-form" onSubmit={submit} noValidate>
        <TextField label="Your name" autoComplete="name" error={errors.displayName?.message} {...register('displayName')} />
        <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 10 characters, mixing letters with numbers, spaces or symbols."
          error={errors.password?.message}
          {...register('password')}
        />
        <div className={`auth-terms ${termsError ? 'form-field-invalid' : ''}`}>
          <label className="auth-checkbox">
            <input
              type="checkbox"
              aria-invalid={Boolean(termsError)}
              aria-describedby={termsError ? termsErrorId : undefined}
              {...register('acceptTerms')}
            />
            <span>I agree to the BFB Terms of Service and Privacy Policy.</span>
          </label>
          {termsError ? <p className="form-field-error" id={termsErrorId}>{termsError}</p> : null}
        </div>
        <button type="submit" className="button button-primary button-large auth-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : <>Create account <ArrowRight size={18} aria-hidden="true" /></>}
        </button>
      </form>
      <p className="auth-switch">Already have an account? <Link to={paths.login} state={from ? { from } : undefined}>Log in</Link></p>
    </AuthLayout>
  )
}
