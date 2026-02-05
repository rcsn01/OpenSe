import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WorkflowProvider } from './context/WorkflowContext';
import { ReactFlowProvider } from 'reactflow';

// Layouts
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { GodModePage } from './pages/auth/GodModePage';
import { DashboardPage } from './pages/DashboardPage';
import { WorkflowEditorPage } from './pages/WorkflowEditorPage';
import { OrganisationPage } from './pages/OrganisationPage'; // New Import
import { UserSettingsPage } from './pages/UserSettingsPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { SystemCheck } from './components/guards/SystemCheck';
import { GalleryPage } from './pages/GalleryPage';
import { ActivitiesPage } from './pages/ActivitiesPage';

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
                  <Route path="/organisation" element={<OrganisationPage />} /> {/* New Route */}
                  <Route path="/activity" element={<ActivitiesPage />} />
                  <Route path="/settings/profile" element={<UserSettingsPage />} />
                  <Route path="/admin" element={<SuperAdminPage />} />
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