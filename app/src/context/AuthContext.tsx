import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, readStoredSession } from '../lib/supabase';

// Guard against a hung getSession by timing it out; fall back to null session if it stalls.
const getSessionSafe = async (timeoutMs = 4000) => {
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('getSession timeout')), timeoutMs)),
    ]);
    return result as Awaited<ReturnType<typeof supabase.auth.getSession>>;
  } catch (error) {
    console.error('Auth getSession failed or timed out:', error);
    return { data: { session: readStoredSession() }, error: error as any };
  }
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isSuperAdmin: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    // Check active session safely
    const initSession = async () => {
      try {
        const {
          data: { session },
        } = await getSessionSafe();
        const effectiveSession = session ?? readStoredSession();
        setSession(effectiveSession);
        setUser(effectiveSession?.user ?? null);

        if (effectiveSession?.user) {
          const { data } = await supabase
            .from('super_admin_members')
            .select('user_id')
            .eq('user_id', effectiveSession.user.id)
            .maybeSingle();
          setIsSuperAdmin(!!data);
        } else {
          setIsSuperAdmin(false);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        // ALWAYS turn off loading, even if there's an error
        setLoading(false);
      }
    };

    initSession();

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextSession = session ?? readStoredSession();
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        const { data } = await supabase
          .from('super_admin_members')
          .select('user_id')
          .eq('user_id', nextSession.user.id)
          .maybeSingle();
        setIsSuperAdmin(!!data);
      } else {
        setIsSuperAdmin(false);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
