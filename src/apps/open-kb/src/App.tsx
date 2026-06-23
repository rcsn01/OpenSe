import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { EmptyState, ThemeProvider } from '@repo/ui'
import { AuthRedirectPage } from '@repo/shared/auth'
import { AuthProvider, useAuth } from '@repo/shared/auth/context'
import { Toaster } from 'sonner'
import { AppLayout } from './layouts/AppLayout'
import { OrganisationProvider, useOrganisation } from './contexts/OrganisationContext'
import { buildAccountsAuthUrl, buildAccountsOnboardingUrl } from './lib/authRedirect'
import { PermissionRoute } from './components/PermissionRoute'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })))
const TeamsPage = lazy(() => import('./pages/TeamsPage').then((module) => ({ default: module.TeamsPage })))
const NewProjectPage = lazy(() => import('./pages/NewProjectPage').then((module) => ({ default: module.NewProjectPage })))
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage').then((module) => ({ default: module.ProjectDetailPage })))
const IssueDetailPage = lazy(() => import('./pages/IssueDetailPage').then((module) => ({ default: module.IssueDetailPage })))
const CyclesPage = lazy(() => import('./pages/CyclesPage').then((module) => ({ default: module.CyclesPage })))
const NewCyclePage = lazy(() => import('./pages/NewCyclePage').then((module) => ({ default: module.NewCyclePage })))
const NewPagePage = lazy(() => import('./pages/NewPagePage').then((module) => ({ default: module.NewPagePage })))
const PageDetailPage = lazy(() => import('./pages/PageDetailPage').then((module) => ({ default: module.PageDetailPage })))
const StickiesPage = lazy(() => import('./pages/StickiesPage').then((module) => ({ default: module.StickiesPage })))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage })))
const PublicBoardPage = lazy(() => import('./pages/PublicBoardPage').then((module) => ({ default: module.PublicBoardPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))

const PageFallback = () => <EmptyState title="Loading page..." description="" />

const lazyRoute = (page: ReactNode) => (
  <Suspense fallback={<PageFallback />}>
    {page}
  </Suspense>
)

const OrganisationGate = () => {
  const { organisations, isLoading, loadError } = useOrganisation()
  const location = useLocation()
  const shouldRedirectToOnboarding = !isLoading && !loadError && organisations.length === 0

  useEffect(() => {
    if (!shouldRedirectToOnboarding) {
      return
    }

    window.location.assign(
      buildAccountsOnboardingUrl(`${location.pathname}${location.search}${location.hash}`),
    )
  }, [location.hash, location.pathname, location.search, shouldRedirectToOnboarding])

  if (isLoading) {
    return <EmptyState title="Loading organisations..." description="" />
  }

  if (shouldRedirectToOnboarding) {
    return <EmptyState title="Redirecting to Accounts..." description="" />
  }

  return <Outlet />
}

export const RootRedirect = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return <EmptyState title="Loading session..." description="" />
  }

  return <Navigate to={user ? '/dashboard' : '/auth'} replace />
}

export function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <EmptyState title="Loading session..." description="" />
  }

  if (!user) {
    return (
      <ThemeProvider
        defaultTheme="light"
        storageKey="opense-theme"
        cookieKey="opense-theme"
        respectStoredTheme={true}
      >
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/public/boards/:slug" element={lazyRoute(<PublicBoardPage />)} />
          <Route path="/auth" element={<AuthRedirectPage mode="signin" buildAuthUrl={buildAccountsAuthUrl} />} />
          <Route path="/signup" element={<AuthRedirectPage mode="signup" buildAuthUrl={buildAccountsAuthUrl} />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider
      defaultTheme="light"
      storageKey="opense-theme"
      cookieKey="opense-theme"
      respectStoredTheme={true}
    >
      <OrganisationProvider userId={user.id}>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/public/boards/:slug" element={lazyRoute(<PublicBoardPage />)} />
          <Route element={<OrganisationGate />}>
            <Route element={<AppLayout />}>
              <Route index element={<RootRedirect />} />
              <Route element={<PermissionRoute permission="dashboard.view" />}>
                <Route path="/dashboard" element={lazyRoute(<DashboardPage />)} />
              </Route>
              <Route element={<PermissionRoute permission="projects.view" />}>
                <Route path="/teams" element={lazyRoute(<TeamsPage />)} />
                <Route path="/projects" element={lazyRoute(<ProjectsPage />)} />
                <Route path="/projects/:projectId/issues/:issueId" element={lazyRoute(<IssueDetailPage />)} />
                <Route path="/projects/:projectId/pages/new" element={lazyRoute(<NewPagePage />)} />
                <Route path="/projects/:projectId/pages/:pageId" element={lazyRoute(<PageDetailPage />)} />
                <Route path="/projects/:projectId" element={lazyRoute(<ProjectDetailPage />)} />
                <Route path="/projects/:projectId/:section" element={lazyRoute(<ProjectDetailPage />)} />
                <Route path="/projects/:projectId/:section/:tabId" element={lazyRoute(<ProjectDetailPage />)} />
              </Route>
              <Route element={<PermissionRoute permission="projects.create" />}>
                <Route path="/projects/new" element={lazyRoute(<NewProjectPage />)} />
              </Route>
              <Route element={<PermissionRoute permission="planning.view" />}>
                <Route path="/cycles" element={lazyRoute(<CyclesPage />)} />
              </Route>
              <Route element={<PermissionRoute permission="planning.manage" />}>
                <Route path="/cycles/new" element={lazyRoute(<NewCyclePage />)} />
              </Route>
              <Route element={<PermissionRoute permission="pages.view" />}>
                <Route path="/stickies" element={lazyRoute(<StickiesPage />)} />
              </Route>
              <Route element={<PermissionRoute permission="analytics.view" />}>
                <Route path="/analytics" element={lazyRoute(<AnalyticsPage />)} />
              </Route>
              <Route element={<PermissionRoute permission="dashboard.view" />}>
                <Route path="/notifications" element={lazyRoute(<NotificationsPage />)} />
              </Route>
              <Route element={<PermissionRoute permission="settings.view" />}>
                <Route path="/settings" element={lazyRoute(<SettingsPage />)} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </OrganisationProvider>
    </ThemeProvider>
  )
}

const AppWithProviders = () => (
  <AuthProvider>
    <App />
  </AuthProvider>
)

export default AppWithProviders
