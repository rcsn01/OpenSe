import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

type AdminRouteProps = {
    children: React.ReactNode;
};

/**
 * Route guard that prevents non-admin users from accessing admin routes.
 * - Redirects to "/" if user is not authenticated or not a super admin.
 * - Shows loading state while auth status is being determined.
 */
export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
    const { user, loading, isSuperAdmin, superAdminChecked } = useAuth();

    // Show loading spinner while auth state is being determined
    if (loading || !superAdminChecked) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Verifying access...</p>
                </div>
            </div>
        );
    }

    // Redirect if not authenticated
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Redirect if not a super admin
    if (!isSuperAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    // User is authenticated and is a super admin
    return <>{children}</>;
};
