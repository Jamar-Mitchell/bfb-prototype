import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import type { LoginLocationState } from '../features/auth/LoginPage'
import { onSessionExpired } from '../lib/auth/tokens'
import { paths } from './router/paths'

/** When the API ends the session, go to login and come back to the current page afterwards. */
export function useSessionExpiredRedirect() {
  const navigate = useNavigate()
  const location = useLocation()
  const current = `${location.pathname}${location.search}`

  useEffect(
    () =>
      onSessionExpired(() => {
        const state: LoginLocationState = { reason: 'expired', from: current }
        navigate(paths.login, { replace: true, state })
      }),
    [navigate, current],
  )
}
