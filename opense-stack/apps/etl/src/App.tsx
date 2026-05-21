import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@repo/ui';
import { AuthRedirectPage } from '@repo/shared/auth';
import { AuthProvider } from '@repo/shared/auth/context';
import { buildAccountsSettingsUrl } from '@repo/shared/utils';
import { getRuntimeConfigValue } from '@repo/shared/runtime-config';
import { DemoProvider } from './context/DemoContext';
import { WorkflowProvider } from './context/WorkflowContext';
import { ReactFlowProvider } from 'reactflow';
import { buildAccountsAuthUrl } from './lib/authRedirect';
import { RootRedirect } from './RootRedirect';

// Layouts
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';

// Pages (eagerly loaded)
import { DashboardPage } from './pages/DashboardPage';
import { WorkflowEditorPage } from './pages/WorkflowEditorPage';
import { OrganisationPage } from './pages/OrganisationPage';
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

const AccountsProfileRedirect = () => {
  const accountsUrl =
    getRuntimeConfigValue('VITE_ACCOUNTS_URL', 'https://accounts.rcsn01.com') ??
    'https://accounts.rcsn01.com';

  useEffect(() => {
    window.location.assign(buildAccountsSettingsUrl({ accountsUrl }));
  }, [accountsUrl]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-[var(--color-muted-foreground)]">
      Redirecting to account profile...
    </div>
  );
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
                    <Route path="/settings/profile" element={<AccountsProfileRedirect />} />
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
