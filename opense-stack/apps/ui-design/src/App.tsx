import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@repo/shared/auth/context'
import { AppLayout } from './layouts/AppLayout'

const IndexPage = lazy(() => import('./pages/IndexPage').then((module) => ({ default: module.IndexPage })))
const ColorPalettePage = lazy(() => import('./pages/ColorPalettePage').then((module) => ({ default: module.ColorPalettePage })))
const TypographyPage = lazy(() => import('./pages/TypographyPage').then((module) => ({ default: module.TypographyPage })))
const SpacingPage = lazy(() => import('./pages/SpacingPage').then((module) => ({ default: module.SpacingPage })))
const ButtonsPage = lazy(() => import('./pages/ButtonsPage').then((module) => ({ default: module.ButtonsPage })))
const FormsPage = lazy(() => import('./pages/FormsPage').then((module) => ({ default: module.FormsPage })))
const CardsPage = lazy(() => import('./pages/CardsPage').then((module) => ({ default: module.CardsPage })))
const BadgesPage = lazy(() => import('./pages/BadgesPage').then((module) => ({ default: module.BadgesPage })))
const AlertsPage = lazy(() => import('./pages/AlertsPage').then((module) => ({ default: module.AlertsPage })))
const DataDisplayPage = lazy(() => import('./pages/DataDisplayPage').then((module) => ({ default: module.DataDisplayPage })))
const NavigationPage = lazy(() => import('./pages/NavigationPage').then((module) => ({ default: module.NavigationPage })))
const OverlaysPage = lazy(() => import('./pages/OverlaysPage').then((module) => ({ default: module.OverlaysPage })))
const DividersPage = lazy(() => import('./pages/DividersPage').then((module) => ({ default: module.DividersPage })))
const TestPage = lazy(() => import('./pages/TestPage').then((module) => ({ default: module.TestPage })))

const routeFallback = (
  <div className="flex min-h-[240px] items-center justify-center text-sm text-[var(--color-muted-foreground)]">
    Loading...
  </div>
)

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={routeFallback}>
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
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
