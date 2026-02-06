import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { DEMO_USER_ID, DEMO_USER_EMAIL, DEMO_USER_NAME } from '../lib/demoData';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isSuperAdmin: boolean;
  // Demo mode support
  isDemoUser: boolean;
  loginAsDemo: () => void;
  logoutDemo: () => void;
}

// Synthetic demo user object (partial User type)
const createDemoUser = (): User => ({
  id: DEMO_USER_ID,
  email: DEMO_USER_EMAIL,
  app_metadata: {},
  user_metadata: { full_name: DEMO_USER_NAME },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User);

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isSuperAdmin: false,
  isDemoUser: false,
  loginAsDemo: () => { },
  logoutDemo: () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isDemoUser, setIsDemoUser] = useState(false);

  const loadSuperAdmin = async (userId: string | null | undefined) => {
    if (!userId || userId === DEMO_USER_ID) {
      setIsSuperAdmin(false);
      return;
    }

    const { data, error } = await supabase.rpc('get_super_admin_status');
    if (error) {
      console.error('Failed to fetch super admin status:', error);
      setIsSuperAdmin(false);
      return;
    }
    setIsSuperAdmin(Boolean(data));
  };

  // Login as demo user (no Supabase)
  const loginAsDemo = useCallback(() => {
    const demoUser = createDemoUser();
    setUser(demoUser);
    setSession(null); // No real session for demo
    setIsDemoUser(true);
    setIsSuperAdmin(false); // Demo users are never super admins
    setLoading(false);
  }, []);

  // Logout from demo mode
  const logoutDemo = useCallback(() => {
    setUser(null);
    setSession(null);
    setIsDemoUser(false);
    setIsSuperAdmin(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      // Don't overwrite demo user if already in demo mode
      if (isDemoUser) return;

      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
      loadSuperAdmin(data.session?.user?.id);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Don't overwrite demo user state
      if (isDemoUser) return;

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      loadSuperAdmin(session?.user?.id);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isDemoUser]);

  return (
    <AuthContext.Provider value={{
      session,
      user,
      loading,
      isSuperAdmin,
      isDemoUser,
      loginAsDemo,
      logoutDemo,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
