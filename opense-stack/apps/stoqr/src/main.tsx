import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getRouterBasename } from '@repo/shared/runtime-config'
import { ErrorBoundary } from '@repo/ui'
import './index.css'
import App from './App.tsx'

const routerBasename = getRouterBasename('VITE_STOQR_ROUTER_BASENAME')

const isNonRetryableError = (error: unknown) => {
  const maybeError = error as { status?: number; code?: string } | null
  const status = maybeError?.status

  if (
    status &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 429
  ) {
    return true
  }

  return maybeError?.code === 'PGRST205'
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (isNonRetryableError(error)) return false
        return failureCount < 2
      },
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter basename={routerBasename}>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
)
