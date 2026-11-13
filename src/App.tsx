import { useEffect } from 'react'

import { AppRoutes } from './app/router/routes'
import { restoreSession } from './lib/auth/session'
import { syncSessionAcrossTabs } from './lib/auth/tokens'

function App() {
  useEffect(() => {
    // The prototype kept saved businesses here; they live in the API now (FE-3.2).
    localStorage.removeItem('bfb-saved')
    void restoreSession()
    return syncSessionAcrossTabs()
  }, [])

  return <AppRoutes />
}

export default App
