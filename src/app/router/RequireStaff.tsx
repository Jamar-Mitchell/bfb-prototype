import { Navigate, Outlet } from 'react-router-dom'

import { isPlatformStaff, useSessionStore } from '../../stores/session'
import { paths } from './paths'

/**
 * Guards the admin area (under `RequireAuth`): support and administrator users only.
 * Anyone else is sent to the dashboard, as if the page did not exist. The API refuses
 * them anyway (`403 forbidden`); this only keeps them out of a page they cannot use.
 * Not under `RequireBusiness`: platform staff need not belong to any business.
 */
export function RequireStaff() {
  const user = useSessionStore((state) => state.user)
  if (!isPlatformStaff(user)) return <Navigate to={paths.dashboard} replace />
  return <Outlet />
}
