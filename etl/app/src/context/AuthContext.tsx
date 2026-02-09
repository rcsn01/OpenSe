import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { DEMO_USER_ID, DEMO_USER_EMAIL, DEMO_USER_NAME } from '../lib/demoData';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isSuperAdmin: boolean;
  superAdminChecked: boolean;
  // Demo mode support
  isDemoUser: boolean;
  loginAsDemo: () => void;
  logoutDemo: () => void;
  logout: () => Promise<void>;
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
  superAdminChecked: false,
  isDemoUser: false,
  loginAsDemo: () => { },
  logoutDemo: () => { },
  logout: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [superAdminChecked, setSuperAdminChecked] = useState(false);
  const [isDemoUser, setIsDemoUser] = useState(false);

  const loadSuperAdmin = async (userId: string | null | undefined) => {
    setSuperAdminChecked(false);
    if (!userId || userId === DEMO_USER_ID) {
      setIsSuperAdmin(false);
      setSuperAdminChecked(true);
      return false;
    }

    const { data, error } = await supabase.rpc('get_super_admin_status');
    if (error) {
      console.error('Failed to fetch super admin status:', error);
      setIsSuperAdmin(false);
      setSuperAdminChecked(true);
      return false;
    }
    const isAdmin = Boolean(data);
    setIsSuperAdmin(isAdmin);
    setSuperAdminChecked(true);
    return isAdmin;
  };

  // Login as demo user (no Supabase)
  const loginAsDemo = useCallback(() => {
    const demoUser = createDemoUser();
    setUser(demoUser);
    setSession(null); // No real session for demo
    setIsDemoUser(true);
    setIsSuperAdmin(false); // Demo users are never super admins
    setSuperAdminChecked(true);
    setLoading(false);
  }, []);

  // Logout from demo mode
  const logoutDemo = useCallback(() => {
    setUser(null);
    setSession(null);
    setIsDemoUser(false);
    setIsSuperAdmin(false);
    setSuperAdminChecked(false);
  }, []);

  // Logout (handles both demo and real users)
  const logout = useCallback(async () => {
    if (isDemoUser) {
      logoutDemo();
    } else {
      await supabase.auth.signOut();
    }
  }, [isDemoUser, logoutDemo]);

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      // If a real session exists, it always takes precedence
      if (data.session) {
        setIsDemoUser(false);
        setSession(data.session);
        setUser(data.session.user);
        // Do not block UI on admin RPC
        void loadSuperAdmin(data.session.user.id);
      } else if (isDemoUser) {
        // Keep demo state if explicitly in demo mode
      } else {
        setSession(null);
        setUser(null);
        setIsSuperAdmin(false);
        setSuperAdminChecked(true);
      }
      setLoading(false);
    };
    void initializeSession();

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoading(true);
      if (session) {
        // Real user logged in -> force demo mode OFF and use real session
        setIsDemoUser(false);
        setSession(session);
        setUser(session.user);
        // Do not block UI on admin RPC
        void loadSuperAdmin(session.user.id);
      } else {
        // Session cleared
        // Only clear user state if we are NOT in demo mode
        // If we are in demo mode, session is meant to be null
        if (!isDemoUser) {
          setSession(null);
          setUser(null);
          setIsSuperAdmin(false);
          setSuperAdminChecked(true);
        }
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isDemoUser]); // Re-run effect when isDemoUser changes to ensure correct logic

  return (
    <AuthContext.Provider value={{
      session,
      user,
      loading,
      isSuperAdmin,
      superAdminChecked,
      isDemoUser,
      loginAsDemo,
      logoutDemo,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
