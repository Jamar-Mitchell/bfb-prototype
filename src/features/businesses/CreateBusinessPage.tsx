import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { paths } from '../../app/router/paths'
import { useAppNavigate } from '../../app/router/useAppNavigate'
import { ErrorState, LoadingState } from '../../components/feedback'
import { TextField } from '../../components/forms'
import { toApiError } from '../../lib/api/errors'
import { logout } from '../../lib/auth/session'
import { addBusiness, businessToSessionBusiness } from '../../lib/businesses/activeBusiness'
import { useMemberships } from '../../lib/businesses/useActiveBusiness'
import { applyApiFieldErrors } from '../../lib/forms/applyApiFieldErrors'
import { useSessionStore } from '../../stores/session'
import { AuthLayout, AuthMessage } from '../auth/AuthLayout'
import { createBusiness } from './businessesApi'
import '../../app/router/RequireAuth.css'

// Limits from bfb-api docs/BUSINESSES.md.
const createBusinessSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, 'Enter your business name.')
    .max(100, 'Use 100 characters or fewer.'),
  legal_name: z.string().trim().max(200, 'Use 200 characters or fewer.'),
})

type CreateBusinessValues = z.infer<typeof createBusinessSchema>

type FormProblem = { kind: 'email-not-verified' } | { kind: 'error'; message: string }

/**
 * Create-business step. A user with no business lands here after logging in; a user
 * with businesses reaches it from the switcher ("Create another business").
 */
export function CreateBusinessPage() {
  const { memberships, error, retry } = useMemberships()

  if (memberships === null) {
    return (
      <div className="session-gate">
        {error ? (
          <ErrorState title="We couldn’t load your businesses" error={error} onRetry={() => void retry()} />
        ) : (
          <LoadingState label="Loading your businesses…" />
        )}
      </div>
    )
  }

  return <CreateBusinessForm firstBusiness={memberships.length === 0} />
}

function CreateBusinessForm({ firstBusiness }: { firstBusiness: boolean }) {
  const navigate = useNavigate()
  const go = useAppNavigate()
  const email = useSessionStore((state) => state.user?.email)
  const [problem, setProblem] = useState<FormProblem | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateBusinessValues>({
    resolver: zodResolver(createBusinessSchema),
    defaultValues: { display_name: '', legal_name: '' },
  })

  const submit = handleSubmit(async (values) => {
    setProblem(null)

    try {
      const business = await createBusiness({
        display_name: values.display_name,
        legal_name: values.legal_name || null,
      })
      addBusiness(businessToSessionBusiness(business))
      navigate(paths.dashboard, { replace: true })
      window.scrollTo(0, 0)
    } catch (submitError) {
      const apiError = toApiError(submitError)

      if (apiError.code === 'email_not_verified') {
        setProblem({ kind: 'email-not-verified' })
        return
      }

      const unmatched = applyApiFieldErrors(apiError, setError, { knownFields: ['display_name', 'legal_name'] })
      if (apiError.fieldErrors.length === 0 || unmatched.length > 0) {
        setProblem({ kind: 'error', message: apiError.userMessage })
      }
    }
  })

  const headerAction = firstBusiness ? (
    <button type="button" className="text-button" onClick={() => void logout()}>Log out</button>
  ) : (
    <button type="button" className="text-button" onClick={() => go(paths.dashboard)}>Back to dashboard</button>
  )

  return (
    <AuthLayout
      kicker={firstBusiness ? 'SET UP YOUR BUSINESS' : 'NEW BUSINESS'}
      title={firstBusiness ? 'Create your business' : 'Create another business'}
      intro={
        firstBusiness
          ? 'Add the business you trade for on BFB. You can fill in its full profile next.'
          : 'Add another business you trade for. You can switch between your businesses at any time.'
      }
      headerAction={headerAction}
    >
      {problem?.kind === 'email-not-verified' ? (
        <VerifyEmailFirst email={email} />
      ) : problem?.kind === 'error' ? (
        <AuthMessage tone="error">{problem.message}</AuthMessage>
      ) : null}
      <form className="auth-form" onSubmit={submit} noValidate>
        <TextField
          label="Business name"
          autoComplete="organization"
          required
          error={errors.display_name?.message}
          {...register('display_name')}
        />
        <TextField
          label="Legal name"
          hint="Optional. The registered name, if it differs from the business name."
          error={errors.legal_name?.message}
          {...register('legal_name')}
        />
        <button type="submit" className="button button-primary button-large auth-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating business…' : <>Create business <ArrowRight size={18} aria-hidden="true" /></>}
        </button>
      </form>
    </AuthLayout>
  )
}

/** Shown when the API refuses to create a business because the email is not verified yet. */
function VerifyEmailFirst({ email }: { email?: string }) {
  return (
    <AuthMessage tone="error">
      Verify your email address{email ? ` (${email})` : ''} before creating a business, then try again.
      {/* TODO(FE-1.3): add the "Resend verification email" button here. */}
    </AuthMessage>
  )
}
