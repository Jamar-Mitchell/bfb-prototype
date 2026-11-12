import { Navigate, Outlet } from 'react-router-dom'

import { ErrorState, LoadingState } from '../../components/feedback'
import { useMemberships } from '../../lib/businesses/useActiveBusiness'
import { useSessionStore } from '../../stores/session'
import { paths } from './paths'
import './RequireAuth.css'

/**
 * Guards business pages (under `RequireAuth`). Loads the user's memberships and sends a
 * user without a business to the create-business step. Below it, an active business always exists.
 */
export function RequireBusiness() {
  const { memberships, error, retry } = useMemberships()
  const activeBusiness = useSessionStore((state) => state.activeBusiness)

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

  if (!activeBusiness) return <Navigate to={paths.createBusiness} replace />

  return <Outlet />
}
