import { Navigate } from 'react-router-dom';
import { useAuth } from '@repo/shared/auth/context';

export const RootRedirect = () => {
  const { loading, session, user } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500">Loading...</div>;
  }

  if (session || user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};
