import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { getRouterBasename } from '@repo/shared/runtime-config'
import { ErrorBoundary } from '@repo/ui'
import './index.css'
import App from './App'

const routerBasename = getRouterBasename('VITE_ACCOUNTS_ROUTER_BASENAME')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={routerBasename}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
