import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@repo/shared/auth/context'
import { AppLayout } from './layouts/AppLayout'
import { IndexPage } from './pages/IndexPage'
import { ColorPalettePage } from './pages/ColorPalettePage'
import { TypographyPage } from './pages/TypographyPage'
import { SpacingPage } from './pages/SpacingPage'
import { ButtonsPage } from './pages/ButtonsPage'
import { FormsPage } from './pages/FormsPage'
import { CardsPage } from './pages/CardsPage'
import { BadgesPage } from './pages/BadgesPage'
import { AlertsPage } from './pages/AlertsPage'
import { DataDisplayPage } from './pages/DataDisplayPage'
import { NavigationPage } from './pages/NavigationPage'
import { OverlaysPage } from './pages/OverlaysPage'
import { DividersPage } from './pages/DividersPage'
import { TestPage } from './pages/TestPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<IndexPage />} />
            <Route path="/colors" element={<ColorPalettePage />} />
            <Route path="/typography" element={<TypographyPage />} />
            <Route path="/spacing" element={<SpacingPage />} />
            <Route path="/buttons" element={<ButtonsPage />} />
            <Route path="/forms" element={<FormsPage />} />
            <Route path="/cards" element={<CardsPage />} />
            <Route path="/badges" element={<BadgesPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/data" element={<DataDisplayPage />} />
            <Route path="/navigation" element={<Navigate to="/navigation/overview" replace />} />
            <Route path="/navigation/:tab" element={<NavigationPage />} />
            <Route path="/overlays" element={<OverlaysPage />} />
            <Route path="/dividers" element={<DividersPage />} />
            <Route path="/test" element={<TestPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
