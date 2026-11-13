import { Navigate, Outlet, useLocation, useParams, useRoutes, type RouteObject } from 'react-router-dom'

import { AppShell } from '../../components/layout/AppShell'
import { AdminBusinessPage } from '../../features/admin/AdminBusinessPage'
import { ReviewQueuePage } from '../../features/admin/ReviewQueuePage'
import { ForgotPasswordPage } from '../../features/auth/ForgotPasswordPage'
import { LoginPage } from '../../features/auth/LoginPage'
import { RegisterPage } from '../../features/auth/RegisterPage'
import { ResetPasswordPage } from '../../features/auth/ResetPasswordPage'
import { VerifyEmailPage } from '../../features/auth/VerifyEmailPage'
import { BusinessProfile } from '../../features/businesses/BusinessProfile'
import { CreateBusinessPage } from '../../features/businesses/CreateBusinessPage'
import { ProfileManagementPage } from '../../features/businesses/ProfileManagementPage'
import { PublicBusinessProfilePage } from '../../features/businesses/PublicBusinessProfile'
import { Dashboard } from '../../features/dashboard/Dashboard'
import { ExchangesPage } from '../../features/exchanges/ExchangesPage'
import { LandingPage } from '../../features/landing/LandingPage'
import { ListingsPage } from '../../features/listings/ListingsPage'
import { Marketplace } from '../../features/matching/Marketplace'
import { MessagesPage } from '../../features/messages/MessagesPage'
import { Onboarding } from '../../features/onboarding/Onboarding'
import { AcceptInvitePage } from '../../features/team/AcceptInvitePage'
import { TeamPage } from '../../features/team/TeamPage'
import { businesses } from '../../mocks/businesses'
import { adminBusinessPattern, getBusinessIdFromPath, isBusinessUuid, paths, publicBusinessPattern } from './paths'
import { useActiveBusinessId, useMemberships } from '../../lib/businesses/useActiveBusiness'
import { RequireAuth } from './RequireAuth'
import { RequireBusiness } from './RequireBusiness'
import { RequireStaff } from './RequireStaff'
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
  return <Onboarding complete={() => go(paths.dashboard)} exit={() => go(paths.dashboard)} openProfile={() => go(paths.profile)} />
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

/**
 * App shell for the admin area. Staff need not have a business, so this does not wait for
 * one; it still loads the memberships so the sidebar's business switcher works for those who do.
 */
export function AdminLayout() {
  useMemberships()
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

function DashboardRoute() {
  const go = useAppNavigate()
  return (
    <Dashboard
      goMarketplace={() => go(paths.marketplace)}
      openBusiness={(id) => go(paths.business(id))}
      openOnboarding={() => go(paths.onboarding)}
      openProfile={() => go(paths.profile)}
    />
  )
}

/** Demo profile for the marketplace's numeric IDs. A real business ID goes to its public profile. */
function BusinessRoute() {
  const go = useAppNavigate()
  const { pathname } = useLocation()
  const { id } = useParams()
  if (isBusinessUuid(id)) return <Navigate to={paths.publicBusiness(id)} replace />
  const selectedId = getBusinessIdFromPath(pathname)
  const selectedBusiness = businesses.find((business) => business.id === selectedId) ?? businesses[0]
  return <BusinessProfile business={selectedBusiness} goBack={() => go(paths.marketplace)} />
}

export const routes: RouteObject[] = [
  { path: paths.landing, element: <LandingRoute /> },
  { path: paths.login, element: <LoginPage /> },
  { path: paths.register, element: <RegisterPage /> },
  // Emailed links and password recovery work logged in or not.
  { path: paths.verifyEmail, element: <VerifyEmailPage /> },
  { path: paths.forgotPassword, element: <ForgotPasswordPage /> },
  { path: paths.resetPassword, element: <ResetPasswordPage /> },
  // Logged out, it asks the user to log in or register and brings them back.
  { path: paths.acceptInvite, element: <AcceptInvitePage /> },
  // A real business's public profile: no login needed, so it sits outside the app shell.
  { path: publicBusinessPattern, element: <PublicBusinessProfilePage /> },
  {
    // App-shell routes need a logged-in user.
    element: <RequireAuth />,
    children: [
      { path: paths.createBusiness, element: <CreateBusinessPage /> },
      {
        // Support and administrator users only; no business needed.
        element: <RequireStaff />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { path: paths.admin, element: <ReviewQueuePage /> },
              { path: adminBusinessPattern, element: <AdminBusinessPage /> },
            ],
          },
        ],
      },
      {
        // ...and a business to act for.
        element: <RequireBusiness />,
        children: [
          // Profile setup saves to the active business; full screen, outside the shell.
          { path: paths.onboarding, element: <OnboardingRoute /> },
          {
            element: <ShellLayout />,
            children: [
              { path: paths.dashboard, element: <DashboardRoute /> },
              { path: paths.marketplace, element: <Marketplace /> },
              { path: '/business/:id/*', element: <BusinessRoute /> },
              { path: paths.exchanges, element: <ExchangesPage /> },
              { path: paths.messages, element: <MessagesPage /> },
              { path: paths.profile, element: <ProfileManagementPage /> },
              { path: paths.listings, element: <ListingsPage /> },
              { path: paths.team, element: <TeamPage /> },
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
