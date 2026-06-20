import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { EmptyState, ThemeProvider } from '@repo/ui'
import { AuthRedirectPage } from '@repo/shared/auth'
import { AuthProvider, useAuth } from '@repo/shared/auth/context'
import { Toaster } from 'sonner'
import { AppLayout } from './layouts/AppLayout'
import { OrganisationProvider, useOrganisation } from './contexts/OrganisationContext'
import { buildAccountsAuthUrl, buildAccountsOnboardingUrl } from './lib/authRedirect'
import { PermissionRoute } from './components/PermissionRoute'
import { DashboardPage } from './pages/DashboardPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { TeamsPage } from './pages/TeamsPage'
import { NewProjectPage } from './pages/NewProjectPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { IssuesPage } from './pages/IssuesPage'
import { NewIssuePage } from './pages/NewIssuePage'
import { IssueDetailPage } from './pages/IssueDetailPage'
import { DraftIssuesPage } from './pages/DraftIssuesPage'
import { CyclesPage } from './pages/CyclesPage'
import { NewCyclePage } from './pages/NewCyclePage'
import { ModulesPage } from './pages/ModulesPage'
import { NewModulePage } from './pages/NewModulePage'
import { EstimatesPage } from './pages/EstimatesPage'
import { NewEstimatePage } from './pages/NewEstimatePage'
import { PagesPage } from './pages/PagesPage'
import { NewPagePage } from './pages/NewPagePage'
import { PageDetailPage } from './pages/PageDetailPage'
import { StickiesPage } from './pages/StickiesPage'
import { IntakePage } from './pages/IntakePage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { SettingsPage } from './pages/SettingsPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { PublicBoardPage } from './pages/PublicBoardPage'

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
          <Route path="/public/boards/:slug" element={<PublicBoardPage />} />
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
          <Route path="/public/boards/:slug" element={<PublicBoardPage />} />
          <Route element={<OrganisationGate />}>
            <Route element={<AppLayout />}>
              <Route index element={<RootRedirect />} />
              <Route element={<PermissionRoute permission="dashboard.view" />}>
                <Route path="/dashboard" element={<DashboardPage />} />
              </Route>
              <Route element={<PermissionRoute permission="projects.view" />}>
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
              </Route>
              <Route element={<PermissionRoute permission="projects.create" />}>
                <Route path="/projects/new" element={<NewProjectPage />} />
              </Route>
              <Route element={<PermissionRoute permission="issues.view" />}>
                <Route path="/issues" element={<IssuesPage />} />
                <Route path="/issues/:issueId" element={<IssueDetailPage />} />
              </Route>
              <Route element={<PermissionRoute permission="issues.create" />}>
                <Route path="/issues/new" element={<NewIssuePage />} />
                <Route path="/drafts" element={<DraftIssuesPage />} />
              </Route>
              <Route element={<PermissionRoute permission="planning.view" />}>
                <Route path="/cycles" element={<CyclesPage />} />
                <Route path="/modules" element={<ModulesPage />} />
                <Route path="/estimates" element={<EstimatesPage />} />
              </Route>
              <Route element={<PermissionRoute permission="planning.manage" />}>
                <Route path="/cycles/new" element={<NewCyclePage />} />
                <Route path="/modules/new" element={<NewModulePage />} />
                <Route path="/estimates/new" element={<NewEstimatePage />} />
              </Route>
              <Route element={<PermissionRoute permission="pages.view" />}>
                <Route path="/pages" element={<PagesPage />} />
                <Route path="/pages/:pageId" element={<PageDetailPage />} />
                <Route path="/stickies" element={<StickiesPage />} />
              </Route>
              <Route element={<PermissionRoute permission="pages.manage" />}>
                <Route path="/pages/new" element={<NewPagePage />} />
              </Route>
              <Route element={<PermissionRoute permission="intake.view" />}>
                <Route path="/intake" element={<IntakePage />} />
              </Route>
              <Route element={<PermissionRoute permission="analytics.view" />}>
                <Route path="/analytics" element={<AnalyticsPage />} />
              </Route>
              <Route element={<PermissionRoute permission="dashboard.view" />}>
                <Route path="/notifications" element={<NotificationsPage />} />
              </Route>
              <Route element={<PermissionRoute permission="settings.view" />}>
                <Route path="/settings" element={<SettingsPage />} />
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
