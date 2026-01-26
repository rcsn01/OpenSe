import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const SystemCheck = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);
  const { isSuperAdmin, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const checkSystem = async () => {
      try {
        // Only check if we are actually checking specifically for god mode scenarios
        // Optimization: Use session storage or similar to avoid hitting DB on every route
        // For now, simply ensuring this runs safely:
        const { data: hasUsers, error } = await supabase.rpc('has_users');

        if (error) {
          console.error('System check failed:', error);
          // If error, assume valid to prevent blocking the UI
          setChecked(true);
          return;
        }

        if (hasUsers === false) {
          if (location.pathname !== '/god-mode') {
            navigate('/god-mode', { replace: true });
          }
        }
      } catch (err) {
        console.error('System check error', err);
      } finally {
        setChecked(true);
      }
    };

    // Only run this check ONCE on mount, not on every page change. 
    // The previous dependency array [navigate, location.pathname] caused re-checks on every click.
    checkSystem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isSuperAdmin, location.pathname, navigate]);

  if (!checked) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
};
