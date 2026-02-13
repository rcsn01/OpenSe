import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { DEMO_USER_ID, createDemoUser } from './demo'

export interface AuthProviderOptions {
  demoMode?: boolean
  superAdmin?: boolean
}

export interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  logout: () => Promise<void>
  isDemoUser?: boolean
  loginAsDemo?: () => void
  logoutDemo?: () => void
  isSuperAdmin?: boolean
  superAdminChecked?: boolean
}

interface AuthProviderProps extends AuthProviderOptions {
  children: ReactNode
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({
  children,
  demoMode = false,
  superAdmin = false,
}: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const [isDemoUser, setIsDemoUser] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [superAdminChecked, setSuperAdminChecked] = useState(false)

  const loadSuperAdmin = useCallback(async (userId: string | null | undefined) => {
    if (!superAdmin) return false

    setSuperAdminChecked(false)
    if (!userId || userId === DEMO_USER_ID) {
      setIsSuperAdmin(false)
      setSuperAdminChecked(true)
      return false
    }

    const { data, error } = await supabase.rpc('get_super_admin_status')
    if (error) {
      console.error('Failed to fetch super admin status:', error)
      setIsSuperAdmin(false)
      setSuperAdminChecked(true)
      return false
    }

    const isAdmin = Boolean(data)
    setIsSuperAdmin(isAdmin)
    setSuperAdminChecked(true)
    return isAdmin
  }, [superAdmin])

  const loginAsDemo = useCallback(() => {
    if (!demoMode) return

    const demoUser = createDemoUser()
    setUser(demoUser)
    setSession(null)
    setIsDemoUser(true)
    setIsSuperAdmin(false)
    setSuperAdminChecked(true)
    setLoading(false)
  }, [demoMode])

  const logoutDemo = useCallback(() => {
    if (!demoMode) return

    setUser(null)
    setSession(null)
    setIsDemoUser(false)
    setIsSuperAdmin(false)
    setSuperAdminChecked(false)
  }, [demoMode])

  const logout = useCallback(async () => {
    if (demoMode && isDemoUser) {
      logoutDemo()
      return
    }

    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [demoMode, isDemoUser, logoutDemo])

  useEffect(() => {
    let isMounted = true

    const initializeSession = async () => {
      setLoading(true)
      const { data } = await supabase.auth.getSession()
      if (!isMounted) return

      if (data.session) {
        setIsDemoUser(false)
        setSession(data.session)
        setUser(data.session.user)
        if (superAdmin) {
          void loadSuperAdmin(data.session.user.id)
        }
      } else if (demoMode && isDemoUser) {
      } else {
        setSession(null)
        setUser(null)
        setIsSuperAdmin(false)
        if (superAdmin) {
          setSuperAdminChecked(true)
        }
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
        if (superAdmin) {
          void loadSuperAdmin(nextSession.user.id)
        }
      } else if (!(demoMode && isDemoUser)) {
        setSession(null)
        setUser(null)
        setIsSuperAdmin(false)
        if (superAdmin) {
          setSuperAdminChecked(true)
        }
      }
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [demoMode, isDemoUser, loadSuperAdmin, superAdmin])

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
    ...(superAdmin
      ? {
          isSuperAdmin,
          superAdminChecked,
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
    superAdmin,
    isSuperAdmin,
    superAdminChecked,
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
