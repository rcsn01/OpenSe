import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { EmptyState } from '@repo/ui'
import { getRuntimeConfigValue } from '@repo/shared/runtime-config'
import { InstanceSetupPage } from './pages/InstanceSetupPage'
import { getWrapperRuntimeTarget } from './lib/wrapperRuntime'

const ConfiguredAccountsApp = lazy(() => import('./ConfiguredAccountsApp'))

const LoadingConfiguredApp = () => <EmptyState title="Loading Accounts..." description="" />

const hasSupabaseRuntimeConfig = () =>
  Boolean(
    getRuntimeConfigValue('VITE_SUPABASE_URL') &&
      getRuntimeConfigValue('VITE_SUPABASE_ANON_KEY'),
  )

function App() {
  const wrapperRuntimeTarget = getWrapperRuntimeTarget()
  const canRenderSetup = wrapperRuntimeTarget !== null
  const hasConfiguredRuntime = hasSupabaseRuntimeConfig()

  if (!hasConfiguredRuntime && canRenderSetup) {
    return (
      <Routes>
        <Route path="/setup" element={<InstanceSetupPage target={wrapperRuntimeTarget} />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    )
  }

  if (canRenderSetup) {
    return (
      <Routes>
        <Route path="/setup" element={<InstanceSetupPage target={wrapperRuntimeTarget} />} />
        <Route
          path="*"
          element={
            <Suspense fallback={<LoadingConfiguredApp />}>
              <ConfiguredAccountsApp />
            </Suspense>
          }
        />
      </Routes>
    )
  }

  return (
    <Suspense fallback={<LoadingConfiguredApp />}>
      <ConfiguredAccountsApp />
    </Suspense>
  )
}

export default App
