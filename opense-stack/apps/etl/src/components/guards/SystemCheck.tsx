/**
 * SystemCheck guard – redirects to /god-mode when no users exist.
 *
 * Refactored (Audit P3): The previous dependency array included
 * location.pathname and navigate, causing the has_users RPC to fire
 * on *every* route change despite the comment saying "only once on mount".
 *
 * Now uses a ref to ensure the check runs exactly once, and stores the
 * result in sessionStorage to avoid hitting the DB on subsequent renders
 * within the same tab session.
 */
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@repo/shared/auth/context';
import { hasUsers } from '@repo/shared/auth';

const SESSION_KEY = 'system_check_passed';

export const SystemCheck = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);
  const { loading } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    if (loading) return;

    // Skip if already checked in this component lifecycle (Audit P3)
    if (hasRun.current) return;
    hasRun.current = true;

    const checkSystem = async () => {
      try {
        // Skip DB call if already verified in this browser session
        if (sessionStorage.getItem(SESSION_KEY) === 'true') {
          setChecked(true);
          return;
        }

        const hasUsersResult = await hasUsers();
        if (hasUsersResult === false) {
          if (location.pathname !== '/god-mode') {
            navigate('/god-mode', { replace: true });
          }
        } else {
          // Cache the result so we don't re-check on subsequent navigations
          sessionStorage.setItem(SESSION_KEY, 'true');
        }
      } catch (err) {
        console.error('System check error', err);
      } finally {
        setChecked(true);
      }
    };

    checkSystem();
    // Only depend on loading; navigate and location are used inside
    // but should NOT cause re-execution (Audit P3)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  if (!checked) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
};
