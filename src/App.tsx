import { AppRoutes } from './app/router/routes'
import { useSessionExpiredRedirect } from './app/useSessionExpiredRedirect'

function App() {
  useSessionExpiredRedirect()
  return <AppRoutes />
}

export default App
