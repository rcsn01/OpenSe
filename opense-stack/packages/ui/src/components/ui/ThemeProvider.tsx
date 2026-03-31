import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system'
}

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme
}

function readLocalTheme(storageKey: string): Theme | null {
  if (typeof window === 'undefined') return null

  try {
    const localValue = window.localStorage.getItem(storageKey)
    return isTheme(localValue) ? localValue : null
  } catch {
    return null
  }
}

function getCookieDomain(hostname: string): string | undefined {
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return undefined
  }

  const parts = hostname.split('.')
  if (parts.length < 2) return undefined
  return `.${parts.slice(-2).join('.')}`
}

function readCookie(key: string): string | null {
  if (typeof document === 'undefined') return null
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function writeCookie(key: string, value: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const cookieDomain = getCookieDomain(window.location.hostname)
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const domain = cookieDomain ? `; Domain=${cookieDomain}` : ''
  const maxAge = 60 * 60 * 24 * 365
  document.cookie = `${key}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}${domain}`
}

function readStoredTheme(storageKey: string, cookieKey: string): Theme | null {
  const cookieValue = readCookie(cookieKey)
  if (isTheme(cookieValue)) {
    return cookieValue
  }

  return readLocalTheme(storageKey)
}

function persistTheme(theme: Theme, storageKey: string, cookieKey: string) {
  if (typeof window === 'undefined') return

  try {
    if (window.localStorage.getItem(storageKey) !== theme) {
      window.localStorage.setItem(storageKey, theme)
    }
  } catch {
    // Ignore environments that block localStorage writes.
  }

  if (readCookie(cookieKey) !== theme) {
    writeCookie(cookieKey, theme)
  }
}

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
  respectStoredTheme?: boolean
  cookieKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'ui-theme',
  respectStoredTheme = true,
  cookieKey = 'ui-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme
    if (!respectStoredTheme) return defaultTheme

    return readStoredTheme(storageKey, cookieKey) ?? defaultTheme
  })
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => resolveTheme(theme))

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    if (!respectStoredTheme) {
      setThemeState(defaultTheme)
      return
    }

    const syncStoredTheme = () => {
      const storedTheme = readStoredTheme(storageKey, cookieKey) ?? defaultTheme
      setThemeState((currentTheme) => (currentTheme === storedTheme ? currentTheme : storedTheme))
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== storageKey) return
      syncStoredTheme()
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        syncStoredTheme()
      }
    }

    syncStoredTheme()
    window.addEventListener('focus', syncStoredTheme)
    window.addEventListener('storage', handleStorage)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', syncStoredTheme)
      window.removeEventListener('storage', handleStorage)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [respectStoredTheme, defaultTheme, storageKey, cookieKey])

  useEffect(() => {
    if (!respectStoredTheme) return
    persistTheme(theme, storageKey, cookieKey)
  }, [theme, respectStoredTheme, storageKey, cookieKey])

  // Apply dark class to document
  useEffect(() => {
    const resolved = resolveTheme(theme)
    setResolvedTheme(resolved)
    const root = document.documentElement
    root.classList.toggle('dark', resolved === 'dark')
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const resolved = resolveTheme('system')
      setResolvedTheme(resolved)
      document.documentElement.classList.toggle('dark', resolved === 'dark')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = (t: Theme) => {
    setThemeState(t)

    if (respectStoredTheme) {
      persistTheme(t, storageKey, cookieKey)
    }
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
