/**
 * Shared authentication hook - useSession
 *
 * @deprecated Use `useAuth` from `@repo/shared/auth/context` instead.
 *
 * Provides a simple session hook that works for both ETL and StoQR apps.
 * ETL's full AuthContext extends this with demo mode and super admin support.
 */

import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabase'

export const useSession = () => {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (mounted) {
        setSession(data.session ?? null)
        setIsLoading(false)
      }
    }

    fetchSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (mounted) {
          setSession(nextSession)
        }
      }
    )

    return () => {
      mounted = false
      authListener?.subscription.unsubscribe()
    }
  }, [])

  return { session, isLoading }
}
