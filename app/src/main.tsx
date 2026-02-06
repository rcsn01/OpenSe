/**
 * Application entry point.
 *
 * Refactored (Audit P5): Removed the duplicate QueryResumer component
 * that registered visibilitychange/focus event listeners overlapping with
 * the focusManager setup above. React Query's built-in focusManager
 * already handles refetching on tab focus.
 *
 * The pageshow listener (for bfcache restoration) is the only addition
 * not covered by focusManager, so it's kept as a lightweight component.
 */
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
  useQueryClient,
} from '@tanstack/react-query'
import './index.css'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'always',
      refetchOnWindowFocus: 'always',
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      networkMode: 'always',
    },
  },
})

// React Query's built-in focus management handles visibilitychange, focus, and blur
focusManager.setEventListener((handleFocus) => {
  const onVisibility = () => handleFocus(document.visibilityState === 'visible')
  const onFocus = () => handleFocus(true)
  const onBlur = () => handleFocus(false)

  window.addEventListener('visibilitychange', onVisibility, false)
  window.addEventListener('focus', onFocus, false)
  window.addEventListener('blur', onBlur, false)

  return () => {
    window.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('focus', onFocus)
    window.removeEventListener('blur', onBlur)
  }
})

onlineManager.setEventListener((setOnline) => {
  const onOnline = () => setOnline(true)
  const onOffline = () => setOnline(false)

  window.addEventListener('online', onOnline, false)
  window.addEventListener('offline', onOffline, false)

  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
})

/**
 * Handles bfcache restoration (pageshow with persisted=true).
 * This is the only case not covered by focusManager's built-in listeners.
 * (Audit P5: removed duplicate visibilitychange/focus listeners)
 */
const BfcacheResumer = () => {
  const client = useQueryClient()

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        client.invalidateQueries({})
        client.refetchQueries({ type: 'active' })
      }
    }

    window.addEventListener('pageshow', onPageShow, false)

    return () => {
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [client])

  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BfcacheResumer />
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
