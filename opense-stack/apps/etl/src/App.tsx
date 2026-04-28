import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@repo/ui';
import { AuthRedirectPage } from '@repo/shared/auth';
import { AuthProvider, useAuth } from '@repo/shared/auth/context';
import { DemoProvider } from './context/DemoContext';
import { WorkflowProvider } from './context/WorkflowContext';
import { ReactFlowProvider } from 'reactflow';
import { buildAccountsAuthUrl } from './lib/authRedirect';

// Layouts
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';

// Pages (eagerly loaded)
import { DashboardPage } from './pages/DashboardPage';
import { WorkflowEditorPage } from './pages/WorkflowEditorPage';
import { OrganisationPage } from './pages/OrganisationPage';
import { UserSettingsPage } from './pages/UserSettingsPage';
import { SystemCheck } from './components/guards/SystemCheck';
import { GalleryPage } from './pages/GalleryPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { WorkflowList } from './components/dashboard/WorkflowList';
import { TeamTab } from './components/organisation/TeamTab';
import { OrgUsageAnalytics } from './components/organisation/UsageAnalytics';
import { OrgLogsTab } from './components/organisation/OrgLogsTab';
import { PermissionsTab } from './components/organisation/PermissionsTab';

const DashboardIndexRedirect = () => {
  const lastTab = typeof window !== 'undefined' ? window.localStorage.getItem('dashboardLastTab') : null;
  const target = lastTab === 'org' ? 'org' : 'personal';
  return <Navigate to={target} replace />;
};

export const RootRedirect = () => {
  const { loading, session, user, isDemoUser } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500">Loading...</div>;
  }

  if (session || user || isDemoUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

function AppContent() {
  return (
    <ThemeProvider
      defaultTheme="light"
      storageKey="opense-theme"
      cookieKey="opense-theme"
      respectStoredTheme={true}
    >
      <BrowserRouter>
        <ReactFlowProvider>
        <DemoProvider>
            <WorkflowProvider>
              <SystemCheck>
                <Routes>
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="/login" element={<AuthRedirectPage mode="signin" buildAuthUrl={buildAccountsAuthUrl} />} />

                  {/* Auth Routes */}
                  <Route element={<AuthLayout />}>
                    <Route path="/register" element={<AuthRedirectPage mode="signup" buildAuthUrl={buildAccountsAuthUrl} />} />
                  </Route>

                  {/* Protected Routes */}
                  <Route element={<AppLayout />}>
                    {/* Dashboard with Nested Routes */}
                    <Route path="/dashboard" element={<DashboardPage />}>
                      <Route index element={<DashboardIndexRedirect />} />
                      <Route path="personal" element={<WorkflowList mode="personal" />} />
                      <Route path="org" element={<WorkflowList mode="org" />} />
                    </Route>

                    {/* Organisation with Nested Routes */}
                    <Route path="/organisation" element={<OrganisationPage />}>
                      <Route index element={<Navigate to="team" replace />} />
                      <Route path="team" element={<TeamTab />} />
                      <Route path="permissions" element={<PermissionsTab />} />
                      <Route path="usage" element={<OrgUsageAnalytics />} />
                      <Route path="logs" element={<OrgLogsTab />} />
                    </Route>

                    <Route path="/gallery" element={<GalleryPage />} />
                    <Route path="/activity" element={<Navigate to="usage" replace />} />
                    <Route path="/activity/:tab" element={<ActivitiesPage />} />
                    <Route path="/settings/profile" element={<UserSettingsPage />} />
                  </Route>

                  {/* Editor (Separate Layout or No Layout) */}
                  <Route path="/editor/:id" element={<WorkflowEditorPage />} />

                  {/* Catch all */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </SystemCheck>
            </WorkflowProvider>
        </DemoProvider>
        </ReactFlowProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <AuthProvider demoMode>
      <AppContent />
    </AuthProvider>
  );
}