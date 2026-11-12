import { Navigate, Outlet } from 'react-router-dom'

import { ErrorState, LoadingState } from '../../components/feedback'
import { useMemberships } from '../../lib/businesses/useActiveBusiness'
import { isPlatformStaff, useSessionStore } from '../../stores/session'
import { paths } from './paths'
import './RequireAuth.css'

/**
 * Guards business pages (under `RequireAuth`). Loads the user's memberships and sends a
 * user without a business to the create-business step (support and administrator users to the
 * admin area instead). Below it, an active business always exists.
 */
export function RequireBusiness() {
  const { memberships, error, retry } = useMemberships()
  const activeBusiness = useSessionStore((state) => state.activeBusiness)
  const staff = useSessionStore((state) => isPlatformStaff(state.user))

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

  // Platform staff may have no business of their own: their home is the admin area.
  if (!activeBusiness) return <Navigate to={staff ? paths.admin : paths.createBusiness} replace />

  return <Outlet />
}
