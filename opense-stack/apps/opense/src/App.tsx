import { Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@repo/ui'
import { AuthRedirectPage } from '@repo/shared/auth'
import { LandingPage } from './pages/LandingPage'
import { OpenEtlLandingPage } from './pages/OpenEtlLandingPage'
import { OpenStoqrLandingPage } from './pages/OpenStoqrLandingPage'
import {
  buildAccountsAuthUrl,
  buildOpenSeAccountsAuthUrl,
  buildStoqrAccountsAuthUrl,
} from './lib/authRedirect'

export default function App() {
  return (
    <ThemeProvider
      defaultTheme="light"
      storageKey="opense-theme"
      cookieKey="opense-theme"
      respectStoredTheme={true}
    >
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/etl" element={<OpenEtlLandingPage />} />
        <Route path="/stoqr" element={<OpenStoqrLandingPage />} />
        <Route path="/login" element={<AuthRedirectPage mode="signin" buildAuthUrl={buildAccountsAuthUrl} />} />
        <Route path="/register" element={<AuthRedirectPage mode="signup" buildAuthUrl={buildOpenSeAccountsAuthUrl} />} />
        <Route path="/auth" element={<AuthRedirectPage mode="signin" buildAuthUrl={buildStoqrAccountsAuthUrl} />} />
        <Route path="/signup" element={<AuthRedirectPage mode="signup" buildAuthUrl={buildStoqrAccountsAuthUrl} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  )
}