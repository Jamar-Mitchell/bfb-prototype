import { Outlet, useLocation, useRoutes, type RouteObject } from 'react-router-dom'

import { AppShell } from '../../components/layout/AppShell'
import { ForgotPasswordPage } from '../../features/auth/ForgotPasswordPage'
import { LoginPage } from '../../features/auth/LoginPage'
import { RegisterPage } from '../../features/auth/RegisterPage'
import { ResetPasswordPage } from '../../features/auth/ResetPasswordPage'
import { VerifyEmailPage } from '../../features/auth/VerifyEmailPage'
import { BusinessProfile } from '../../features/businesses/BusinessProfile'
import { CreateBusinessPage } from '../../features/businesses/CreateBusinessPage'
import { ProfileManagementPage } from '../../features/businesses/ProfileManagementPage'
import { Dashboard } from '../../features/dashboard/Dashboard'
import { ExchangesPage } from '../../features/exchanges/ExchangesPage'
import { LandingPage } from '../../features/landing/LandingPage'
import { ListingsPage } from '../../features/listings/ListingsPage'
import { Marketplace } from '../../features/matching/Marketplace'
import { MessagesPage } from '../../features/messages/MessagesPage'
import { Onboarding } from '../../features/onboarding/Onboarding'
import { businesses } from '../../mocks/businesses'
import { getBusinessIdFromPath, paths } from './paths'
import { useActiveBusinessId } from '../../lib/businesses/useActiveBusiness'
import { RequireAuth } from './RequireAuth'
import { RequireBusiness } from './RequireBusiness'
import { useAppNavigate } from './useAppNavigate'

function LandingRoute() {
  const go = useAppNavigate()
  return (
    <LandingPage
      enterApp={() => go(paths.onboarding)}
      getStarted={() => go(paths.register)}
      signIn={() => go(paths.login)}
    />
  )
}

function OnboardingRoute() {
  const go = useAppNavigate()
  return <Onboarding complete={() => go(paths.dashboard)} exit={() => go(paths.landing)} />
}

/** App shell for business pages. Keyed by the active business, so a switch remounts the page and it reloads its data. */
export function ShellLayout() {
  const activeBusinessId = useActiveBusinessId()
  return (
    <AppShell>
      <Outlet key={activeBusinessId} />
    </AppShell>
  )
}

function DashboardRoute() {
  const go = useAppNavigate()
  return <Dashboard goMarketplace={() => go(paths.marketplace)} openBusiness={(id) => go(paths.business(id))} />
}

function MarketplaceRoute() {
  const go = useAppNavigate()
  return <Marketplace openBusiness={(id) => go(paths.business(id))} />
}

function BusinessRoute() {
  const go = useAppNavigate()
  const { pathname } = useLocation()
  const selectedId = getBusinessIdFromPath(pathname)
  const selectedBusiness = businesses.find((business) => business.id === selectedId) ?? businesses[0]
  return <BusinessProfile business={selectedBusiness} goBack={() => go(paths.marketplace)} />
}

export const routes: RouteObject[] = [
  { path: paths.landing, element: <LandingRoute /> },
  { path: paths.onboarding, element: <OnboardingRoute /> },
  { path: paths.login, element: <LoginPage /> },
  { path: paths.register, element: <RegisterPage /> },
  // Emailed links and password recovery work logged in or not.
  { path: paths.verifyEmail, element: <VerifyEmailPage /> },
  { path: paths.forgotPassword, element: <ForgotPasswordPage /> },
  { path: paths.resetPassword, element: <ResetPasswordPage /> },
  {
    // App-shell routes need a logged-in user.
    element: <RequireAuth />,
    children: [
      { path: paths.createBusiness, element: <CreateBusinessPage /> },
      {
        // ...and a business to act for.
        element: <RequireBusiness />,
        children: [
          {
            element: <ShellLayout />,
            children: [
              { path: paths.dashboard, element: <DashboardRoute /> },
              { path: paths.marketplace, element: <MarketplaceRoute /> },
              { path: '/business/:id/*', element: <BusinessRoute /> },
              { path: paths.exchanges, element: <ExchangesPage /> },
              { path: paths.messages, element: <MessagesPage /> },
              { path: paths.profile, element: <ProfileManagementPage /> },
              { path: paths.listings, element: <ListingsPage /> },
            ],
          },
        ],
      },
    ],
  },
  // The prototype showed the landing page for any unknown path.
  { path: '*', element: <LandingRoute /> },
]

export function AppRoutes() {
  return useRoutes(routes)
}
