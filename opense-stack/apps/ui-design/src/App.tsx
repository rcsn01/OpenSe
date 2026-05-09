import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@repo/shared/auth/context";
import { ThemeProvider, ToastProvider } from "./components/ui";
import { AppLayout } from "./layouts/AppLayout";
import { LandingNavbarPreviewPage } from "./pages/LandingNavbarPreviewPage";
import { SharedComponentsPage } from "./pages/SharedComponentsPage";
import { StoqrPage } from "./pages/StoqrPage";

function RoutedApp() {
  const { user } = useAuth();

  return (
    <ThemeProvider
      defaultTheme="light"
      storageKey="opense-theme"
      cookieKey="opense-theme"
      respectStoredTheme={Boolean(user)}
    >
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<SharedComponentsPage />} />
              <Route
                path="/preview/landing-navbar"
                element={<LandingNavbarPreviewPage />}
              />
              <Route path="/preview/stoqr" element={<StoqrPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RoutedApp />
    </AuthProvider>
  );
}
