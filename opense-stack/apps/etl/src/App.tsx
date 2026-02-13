import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@repo/ui';
import { AuthProvider, useAuth } from '@repo/shared/auth/context';
import { DemoProvider } from './context/DemoContext';
import { WorkflowProvider } from './context/WorkflowContext';
import { ReactFlowProvider } from 'reactflow';
import { Loader2 } from 'lucide-react';

// Layouts
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';

// Pages (eagerly loaded)
import { AuthRedirectPage } from './pages/auth/AuthRedirectPage';
import { DashboardPage } from './pages/DashboardPage';
import { WorkflowEditorPage } from './pages/WorkflowEditorPage';
import { OrganisationPage } from './pages/OrganisationPage';
import { UserSettingsPage } from './pages/UserSettingsPage';
import { SystemCheck } from './components/guards/SystemCheck';
import { GalleryPage } from './pages/GalleryPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { LandingPage } from './pages/LandingPage';
import { WorkflowList } from './components/dashboard/WorkflowList';
import { TeamTab } from './components/organisation/TeamTab';
import { PaymentSettings } from './components/organisation/PaymentSettings';
import { OrgUsageAnalytics } from './components/organisation/UsageAnalytics';
import { OrgLogsTab } from './components/organisation/OrgLogsTab';

// Guards
import { AdminRoute } from './components/guards/AdminRoute';

// Lazy-loaded admin page (code split - never downloaded by non-admins)
const SuperAdminPage = React.lazy(() =>
  import('./pages/SuperAdminPage').then((module) => ({ default: module.SuperAdminPage }))
);

// Loading fallback for Suspense
const AdminLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-100">
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
      <p className="text-slate-500 text-sm">Loading admin panel...</p>
    </div>
  </div>
);

const DashboardIndexRedirect = () => {
  const lastTab = typeof window !== 'undefined' ? window.localStorage.getItem('dashboardLastTab') : null;
  const target = lastTab === 'org' ? 'org' : 'personal';
  return <Navigate to={target} replace />;
};

function AppContent() {
  const { user } = useAuth();

  return (
    <ThemeProvider
      defaultTheme="light"
      storageKey="opense-theme"
      cookieKey="opense-theme"
      respectStoredTheme={Boolean(user)}
    >
      <BrowserRouter>
        <ReactFlowProvider>
        <DemoProvider>
            <WorkflowProvider>
              <SystemCheck>
                <Routes>
                  {/* Public Landing Page */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<AuthRedirectPage mode="signin" />} />

                  {/* Auth Routes */}
                  <Route element={<AuthLayout />}>
                    <Route path="/register" element={<AuthRedirectPage mode="signup" />} />
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
                      <Route path="billing" element={<PaymentSettings />} />
                      <Route path="usage" element={<OrgUsageAnalytics />} />
                      <Route path="logs" element={<OrgLogsTab />} />
                    </Route>

                    <Route path="/gallery" element={<GalleryPage />} />
                    <Route path="/activity" element={<ActivitiesPage />} />
                    <Route path="/settings/profile" element={<UserSettingsPage />} />
                    <Route
                      path="/admin"
                      element={
                        <AdminRoute>
                          <Suspense fallback={<AdminLoadingFallback />}>
                            <SuperAdminPage />
                          </Suspense>
                        </AdminRoute>
                      }
                    />
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
    <AuthProvider demoMode superAdmin>
      <AppContent />
    </AuthProvider>
  );
}