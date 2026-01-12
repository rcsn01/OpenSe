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
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { WorkflowEditorPage } from './pages/editor/WorkflowEditorPage';
import { OrganizationSettingsPage } from './pages/settings/OrganizationSettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <ReactFlowProvider>
        <AuthProvider>
          <WorkflowProvider>
            <Routes>
              {/* Public Routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>

              {/* Protected Routes */}
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/settings/org" element={<OrganizationSettingsPage />} />
              </Route>

              {/* Editor (Separate Layout or No Layout) */}
              <Route path="/editor/:id" element={<WorkflowEditorPage />} />

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </WorkflowProvider>
        </AuthProvider>
      </ReactFlowProvider>
    </BrowserRouter>
  );
}
