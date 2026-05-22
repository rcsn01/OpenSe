import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { DEMO_USER_ID, createDemoUser } from './demo'
import { reportAuthError } from './errorReporting'

export interface AuthProviderOptions {
  demoMode?: boolean
}

export interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  logout: () => Promise<void>
  isDemoUser?: boolean
  loginAsDemo?: () => void
  logoutDemo?: () => void
}

interface AuthProviderProps extends AuthProviderOptions {
  children: ReactNode
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({
  children,
  demoMode = false,
}: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const [isDemoUser, setIsDemoUser] = useState(false)
  const loginAsDemo = useCallback(() => {
    if (!demoMode) return

    const demoUser = createDemoUser()
    setUser(demoUser)
    setSession(null)
    setIsDemoUser(true)
    setLoading(false)
  }, [demoMode])

  const logoutDemo = useCallback(() => {
    if (!demoMode) return

    setUser(null)
    setSession(null)
    setIsDemoUser(false)
  }, [demoMode])

  const logout = useCallback(async () => {
    if (demoMode && isDemoUser) {
      logoutDemo()
      return
    }

    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [demoMode, isDemoUser, logoutDemo])

  const clearInvalidLocalSession = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) {
      reportAuthError('Failed to clear invalid local auth session', error)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const initializeSession = async () => {
      setLoading(true)
      const { data } = await supabase.auth.getSession()
      if (!isMounted) return

      if (data.session) {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (!isMounted) return

        if (userError || !userData.user || userData.user.id !== data.session.user.id) {
          await clearInvalidLocalSession()
          if (!isMounted) return

          setSession(null)
          setUser(null)
          setLoading(false)
          return
        }

        setIsDemoUser(false)
        setSession(data.session)
        setUser(userData.user)
      } else if (demoMode && isDemoUser) {
      } else {
        setSession(null)
        setUser(null)
      }
      setLoading(false)
    }

    void initializeSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setLoading(true)
      if (nextSession) {
        setIsDemoUser(false)
        setSession(nextSession)
        setUser(nextSession.user)
      } else if (!(demoMode && isDemoUser)) {
        setSession(null)
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [clearInvalidLocalSession, demoMode, isDemoUser])

  const value = useMemo<AuthContextType>(() => ({
    session,
    user,
    loading,
    logout,
    ...(demoMode
      ? {
          isDemoUser,
          loginAsDemo,
          logoutDemo,
        }
      : {}),
  }), [
    session,
    user,
    loading,
    logout,
    demoMode,
    isDemoUser,
    loginAsDemo,
    logoutDemo,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
