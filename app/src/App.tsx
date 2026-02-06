import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WorkflowProvider } from './context/WorkflowContext';
import { ReactFlowProvider } from 'reactflow';
import { Loader2 } from 'lucide-react';

// Layouts
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';

// Pages (eagerly loaded)
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { GodModePage } from './pages/auth/GodModePage';
import { DashboardPage } from './pages/DashboardPage';
import { WorkflowEditorPage } from './pages/WorkflowEditorPage';
import { OrganisationPage } from './pages/OrganisationPage';
import { UserSettingsPage } from './pages/UserSettingsPage';
import { SystemCheck } from './components/guards/SystemCheck';
import { GalleryPage } from './pages/GalleryPage';
import { ActivitiesPage } from './pages/ActivitiesPage';

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

export default function App() {
  return (
    <BrowserRouter>
      <ReactFlowProvider>
        <AuthProvider>
          <WorkflowProvider>
            <SystemCheck>
              <Routes>
                <Route path="/god-mode" element={<GodModePage />} />

                {/* Public Routes */}
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                </Route>

                {/* Protected Routes */}
                <Route element={<AppLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/gallery" element={<GalleryPage />} />
                  <Route path="/organisation" element={<OrganisationPage />} />
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
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </SystemCheck>
          </WorkflowProvider>
        </AuthProvider>
      </ReactFlowProvider>
    </BrowserRouter>
  );
}