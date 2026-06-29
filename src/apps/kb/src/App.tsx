import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { EmptyState, ThemeProvider } from '@repo/ui'
import { AuthRedirectPage } from '@repo/shared/auth'
import { AuthProvider, useAuth } from '@repo/shared/auth/context'
import { Toaster } from 'sonner'
import { AppLayout } from './layouts/AppLayout'
import { OrganisationProvider, useOrganisation } from './contexts/OrganisationContext'
import { buildAccountsAuthUrl, buildAccountsOnboardingUrl } from './lib/authRedirect'
import { PermissionRoute } from './components/PermissionRoute'

const HomePage = lazy(() => import('./pages/home/HomePage').then((module) => ({ default: module.HomePage })))
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage').then((module) => ({ default: module.ProjectsPage })))
const TeamsPage = lazy(() => import('./pages/teams/TeamsPage').then((module) => ({ default: module.TeamsPage })))
const NewProjectPage = lazy(() => import('./pages/projects/NewProjectPage').then((module) => ({ default: module.NewProjectPage })))
const ProjectDetailPage = lazy(() => import('./pages/projects/ProjectDetailPage').then((module) => ({ default: module.ProjectDetailPage })))
const IssueDetailPage = lazy(() => import('./pages/projects/issues/IssueDetailPage').then((module) => ({ default: module.IssueDetailPage })))
const GlobalTasksPage = lazy(() => import('./pages/tasks/GlobalTasksPage').then((module) => ({ default: module.GlobalTasksPage })))
const NewCyclePage = lazy(() => import('./pages/projects/cycles/NewCyclePage').then((module) => ({ default: module.NewCyclePage })))
const CycleDetailPage = lazy(() => import('./pages/projects/cycles/CycleDetailPage').then((module) => ({ default: module.CycleDetailPage })))
const AnalyticsPage = lazy(() => import('./pages/analytics/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })))
const InboxPage = lazy(() => import('./pages/inbox/InboxPage').then((module) => ({ default: module.InboxPage })))
const PublicBoardPage = lazy(() => import('./pages/public/PublicBoardPage').then((module) => ({ default: module.PublicBoardPage })))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })))

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

  return <Navigate to={user ? '/home' : '/auth'} replace />
}

const ProjectCyclesRedirect = () => {
  const { projectId = '' } = useParams()
  return <Navigate to={`/projects/${projectId}/list`} replace />
}

const RemovedProjectPagesRedirect = () => {
  const { projectId = '' } = useParams()
  return <Navigate to={`/projects/${projectId}/list`} replace />
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
                <Route path="/home" element={lazyRoute(<HomePage />)} />
                <Route path="/dashboard" element={<Navigate to="/home" replace />} />
              </Route>
              <Route element={<PermissionRoute permission="projects.view" />}>
                <Route path="/teams" element={lazyRoute(<TeamsPage />)} />
                <Route path="/projects" element={lazyRoute(<ProjectsPage />)} />
                <Route path="/projects/:projectId/issues/:issueId" element={lazyRoute(<IssueDetailPage />)} />
                <Route path="/projects/:projectId/:section/issues/:issueId" element={lazyRoute(<ProjectDetailPage />)} />
                <Route path="/projects/:projectId/:section/:tabId/issues/:issueId" element={lazyRoute(<ProjectDetailPage />)} />
                <Route path="/projects/:projectId/:section/cycles/:cycleId" element={lazyRoute(<ProjectDetailPage />)} />
                <Route path="/projects/:projectId/:section/:tabId/cycles/:cycleId" element={lazyRoute(<ProjectDetailPage />)} />
                <Route path="/projects/:projectId/pages" element={<RemovedProjectPagesRedirect />} />
                <Route path="/projects/:projectId/pages/*" element={<RemovedProjectPagesRedirect />} />
                <Route path="/projects/:projectId/note" element={<RemovedProjectPagesRedirect />} />
                <Route path="/projects/:projectId/note/*" element={<RemovedProjectPagesRedirect />} />
                <Route path="/projects/:projectId/cycles" element={<ProjectCyclesRedirect />} />
                <Route path="/projects/:projectId/cycles/:cycleId" element={lazyRoute(<CycleDetailPage />)} />
                <Route path="/projects/:projectId" element={lazyRoute(<ProjectDetailPage />)} />
                <Route path="/projects/:projectId/:section" element={lazyRoute(<ProjectDetailPage />)} />
                <Route path="/projects/:projectId/:section/:tabId" element={lazyRoute(<ProjectDetailPage />)} />
              </Route>
              <Route element={<PermissionRoute permission="issues.view" />}>
                <Route path="/tasks" element={<Navigate to="/tasks/list" replace />} />
                <Route path="/tasks/list/issues/:issueId" element={lazyRoute(<GlobalTasksPage />)} />
                <Route path="/tasks/:section" element={lazyRoute(<GlobalTasksPage />)} />
              </Route>
              <Route element={<PermissionRoute permission="projects.create" />}>
                <Route path="/projects/new" element={lazyRoute(<NewProjectPage />)} />
              </Route>
              <Route element={<PermissionRoute permission="planning.manage" />}>
                <Route path="/projects/:projectId/cycles/new" element={lazyRoute(<NewCyclePage />)} />
              </Route>
              <Route element={<PermissionRoute permission="analytics.view" />}>
                <Route path="/analytics" element={lazyRoute(<AnalyticsPage />)} />
              </Route>
              <Route element={<PermissionRoute permission="dashboard.view" />}>
                <Route path="/inbox" element={lazyRoute(<InboxPage />)} />
                <Route path="/notifications" element={<Navigate to="/inbox" replace />} />
              </Route>
              <Route element={<PermissionRoute permission="settings.view" />}>
                <Route path="/settings" element={lazyRoute(<SettingsPage />)} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/home" replace />} />
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
