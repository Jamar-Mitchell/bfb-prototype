import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { ErrorState, LoadingState } from '../../components/feedback'
import type { LoginLocationState } from '../../features/auth/LoginPage'
import { restoreSession } from '../../lib/auth/session'
import { useSessionStore } from '../../stores/session'
import { paths } from './paths'
import './RequireAuth.css'

/**
 * Guards the app-shell routes. Waits for the session restore, sends logged-out
 * users to login (remembering the page they asked for) and renders the route otherwise.
 */
export function RequireAuth() {
  const status = useSessionStore((state) => state.status)
  const endReason = useSessionStore((state) => state.endReason)
  const restoreError = useSessionStore((state) => state.restoreError)
  const location = useLocation()

  if (status === 'authenticated') return <Outlet />

  if (status === 'anonymous') {
    // After a deliberate logout, logging in again starts from the dashboard.
    const state: LoginLocationState =
      endReason === 'logged-out'
        ? { reason: endReason }
        : { from: `${location.pathname}${location.search}`, reason: endReason ?? undefined }
    return <Navigate to={paths.login} replace state={state} />
  }

  return (
    <div className="session-gate">
      {status === 'error' ? (
        <ErrorState
          title="We couldn’t load your workspace"
          error={restoreError}
          onRetry={() => void restoreSession()}
        />
      ) : (
        <LoadingState label="Loading your workspace…" />
      )}
    </div>
  )
}
