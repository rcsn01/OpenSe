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

// Ensure queries resume after tab/app switches and visibility changes.
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

const QueryResumer = () => {
  const client = useQueryClient()

  useEffect(() => {
    const resume = () => {
      client.invalidateQueries({})
      client.refetchQueries({ type: 'active' })
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        resume()
      }
    }

    const onFocus = () => {
      resume()
    }

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        resume()
      }
    }

    window.addEventListener('visibilitychange', onVisibility, false)
    window.addEventListener('focus', onFocus, false)
    window.addEventListener('pageshow', onPageShow, false)

    return () => {
      window.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [client])

  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <QueryResumer />
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
