import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight } from 'lucide-react'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { paths } from '../../app/router/paths'
import { TextField } from '../../components/forms'
import { toApiError } from '../../lib/api/errors'
import { applyApiFieldErrors } from '../../lib/forms/applyApiFieldErrors'
import { AuthLayout, AuthMessage } from './AuthLayout'
import { register as registerAccount } from './authApi'
import type { LoginLocationState } from './LoginPage'
import { newPasswordSchema, PASSWORD_HINT, passwordMessage } from './passwordRules'

const TERMS_MESSAGE = 'Accept the Terms of Service and Privacy Policy to continue.'

/** Registration errors that belong on the invite-code field (bfb-api docs/AUTHENTICATION.md). */
const INVITE_CODE_ERRORS = new Set(['invite_code_required', 'invalid_invite_code', 'invite_code_expired', 'invite_code_exhausted'])

// Mirrors the API's rules (API-1.1) so most mistakes are caught before submitting.
const registerSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter your name.').max(100, 'Use 100 characters or fewer.'),
  email: z.email('Enter a valid email address.'),
  password: newPasswordSchema,
  // Optional: the API only checks it while pilot invites are required, and ignores it otherwise.
  inviteCode: z.string().trim().max(64, 'Invite codes are 64 characters or fewer.'),
  acceptTerms: z.boolean().refine((value) => value, TERMS_MESSAGE),
})

type RegisterValues = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LoginLocationState | null)?.from
  // An invite link looks like `#/register?code=K7QM-3XRP`.
  const [searchParams] = useSearchParams()
  const linkCode = searchParams.get('code')?.trim() ?? ''
  const termsErrorId = useId()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '', inviteCode: linkCode, acceptTerms: false },
  })

  const submit = handleSubmit(async (values) => {
    setFormError(null)

    try {
      await registerAccount({
        display_name: values.displayName,
        email: values.email,
        password: values.password,
        accept_terms: values.acceptTerms,
        invite_code: values.inviteCode || undefined,
      })
      const state: LoginLocationState = { registered: true, email: values.email, from }
      navigate(paths.login, { state })
      window.scrollTo(0, 0)
    } catch (error) {
      const apiError = toApiError(error)

      if (INVITE_CODE_ERRORS.has(apiError.code)) {
        setError('inviteCode', { type: 'server', message: apiError.userMessage }, { shouldFocus: true })
        return
      }

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
        fieldMap: { display_name: 'displayName', accept_terms: 'acceptTerms', invite_code: 'inviteCode' },
        knownFields: ['displayName', 'email', 'password', 'inviteCode', 'acceptTerms'],
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
          hint={PASSWORD_HINT}
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="Invite code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          hint="Optional. Enter it if you were sent one."
          error={errors.inviteCode?.message}
          {...register('inviteCode')}
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
