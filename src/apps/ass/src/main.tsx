import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { applyRuntimeDocumentAttributes, getRouterBasename, getRouterMode } from '@repo/shared/runtime-config'
import { ErrorBoundary } from '@repo/ui'
import App from './App.tsx'
import './index.css'

applyRuntimeDocumentAttributes()

const routerBasename = getRouterBasename('VITE_ASS_ROUTER_BASENAME')
const Router = getRouterMode('VITE_ASS_ROUTER_MODE') === 'hash' ? HashRouter : BrowserRouter
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
