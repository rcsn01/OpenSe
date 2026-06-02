import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@repo/shared/auth/context'
import { getRouterBasename } from '@repo/shared/runtime-config'
import { ErrorBoundary } from '@repo/ui'
import './index.css'
import App from './App'

const routerBasename = getRouterBasename('VITE_OPENSE_ROUTER_BASENAME')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter basename={routerBasename}>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
