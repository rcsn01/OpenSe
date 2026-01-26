import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  LayoutTemplate,
  Building2, 
  LogOut, 
  User, 
  Menu,
  X,
  Activity
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';
import { OrgSimple, useUserOrganisations } from '../hooks/queries/useOrganisations';
import { signOut } from '../api/auth';

export const AppLayout = () => {
  const { session, user, loading } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const location = useLocation();

  // Org State
  const [currentOrg, setCurrentOrg] = useState<OrgSimple | null>(null);
  const { data: userOrgs = [], isLoading: orgsLoading } = useUserOrganisations(user?.id);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  // Default to first org (Single Org Mode)
  useEffect(() => {
    if (userOrgs.length > 0 && !currentOrg) {
      setCurrentOrg(userOrgs[0]);
    } else if (userOrgs.length > 0 && currentOrg) {
      // Ensure current org is still valid
      const exists = userOrgs.find((o) => o.id === currentOrg.id);
      if (!exists) setCurrentOrg(userOrgs[0]);
    } else if (userOrgs.length === 0 && currentOrg) {
      setCurrentOrg(null);
    }
  }, [userOrgs, currentOrg]);

  if (!session && !loading) {
    return <Navigate to="/login" replace />;
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Gallery', href: '/gallery', icon: LayoutTemplate },
    { name: 'Organisation', href: '/organisation', icon: Building2 },
    { name: 'Activity', href: '/activity', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Organisation Display (No Switcher) */}
          {currentOrg ? (
            <div className="p-4 bg-slate-950">
              <div className="flex items-center w-full px-3 py-2 text-sm font-medium text-white bg-slate-800 rounded-md shadow-sm border border-slate-700">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-xs shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">{currentOrg.name}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-950">
               <div className="px-3 py-2 text-xs text-slate-500 text-center border border-dashed border-slate-700 rounded-md">
                 No Organisation
               </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon className={clsx(
                    "mr-3 flex-shrink-0 h-5 w-5",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                  )} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 bg-slate-950 border-t border-slate-800">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
                  <User className="w-5 h-5" />
                </div>
              </div>
              <div className="ml-3 overflow-hidden">
                <Link
                  to="/settings/profile"
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white"
                >
                  <p className="text-sm font-medium text-white truncate max-w-[120px]">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-slate-400 truncate max-w-[120px]">
                    {user?.email || 'user@example.com'}
                  </p>
                </Link>
              </div>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="ml-auto flex-shrink-0 p-1 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-0 left-0 p-4 z-40">
         <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-md bg-slate-800 text-white">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
         </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full">
        <Outlet context={{ currentOrg }} />
      </main>
    </div>
  );
};