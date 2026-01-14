import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

export const SystemCheck = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkSystem = async () => {
      try {
        const { data: hasUsers, error } = await supabase.rpc('has_users');

        if (error) {
          console.error('System check failed:', error);
          setChecked(true);
          return;
        }

        if (hasUsers === false) {
          if (location.pathname !== '/god-mode') {
            navigate('/god-mode', { replace: true });
          }
        } else {
          if (location.pathname === '/god-mode') {
            navigate('/login', { replace: true });
          }
        }
      } finally {
        setChecked(true);
      }
    };

    checkSystem();
  }, [navigate, location.pathname]);

  if (!checked) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
};
