import { useEffect } from 'react'

import { AppRoutes } from './app/router/routes'
import { restoreSession } from './lib/auth/session'
import { syncSessionAcrossTabs } from './lib/auth/tokens'

function App() {
  useEffect(() => {
    void restoreSession()
    return syncSessionAcrossTabs()
  }, [])

  return <AppRoutes />
}

export default App
