import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { reportAuthError } from './errorReporting'

export interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  logout: () => Promise<void>
}

interface AuthProviderProps {
  children: ReactNode
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

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

        setSession(data.session)
        setUser(userData.user)
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
        setSession(nextSession)
        setUser(nextSession.user)
      } else {
        setSession(null)
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [clearInvalidLocalSession])

  const value = useMemo<AuthContextType>(() => ({
    session,
    user,
    loading,
    logout,
  }), [
    session,
    user,
    loading,
    logout,
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
