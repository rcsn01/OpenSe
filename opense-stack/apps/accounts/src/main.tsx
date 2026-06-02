import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { getRouterBasename, getRouterMode } from '@repo/shared/runtime-config'
import { ErrorBoundary } from '@repo/ui'
import './index.css'
import App from './App'

const routerBasename = getRouterBasename('VITE_ACCOUNTS_ROUTER_BASENAME')
const Router = getRouterMode('VITE_ACCOUNTS_ROUTER_MODE') === 'hash' ? HashRouter : BrowserRouter
const routerProps = Router === BrowserRouter ? { basename: routerBasename } : {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Router {...routerProps}>
        <App />
      </Router>
    </ErrorBoundary>
  </StrictMode>,
)
