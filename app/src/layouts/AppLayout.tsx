import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  LayoutTemplate,
  Building2, // Updated Icon
  ChevronDown, 
  LogOut, 
  User, 
  Menu,
  X,
  Check,
  Activity
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useDataStore } from '../store/dataStore';

type OrgSimple = { id: string; name: string };

export const AppLayout = () => {
  const { session, user, loading } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const location = useLocation();

  // Org Selection State
  const [userOrgs, setUserOrgs] = useState<OrgSimple[]>([]);
  const [currentOrg, setCurrentOrg] = useState<OrgSimple | null>(null);
  const [isOrgMenuOpen, setIsOrgMenuOpen] = useState(false);
  const orgMenuRef = useRef<HTMLDivElement>(null);

  const { reset } = useDataStore();

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      reset(); // Clear global data store
      await supabase.auth.signOut();
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  // Close org menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgMenuRef.current && !orgMenuRef.current.contains(event.target as Node)) {
        setIsOrgMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch User Organizations
  useEffect(() => {
    if (!user) return;
    
    const fetchOrgs = async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('organizations(id, name)')
        .eq('user_id', user.id);

      if (!error && data) {
        // Flatten the structure: organization_members -> organizations
        const mappedOrgs = data
          .map((item: any) => (Array.isArray(item.organizations) ? item.organizations[0] : item.organizations))
          .filter((o) => !!o) as OrgSimple[];
        
        setUserOrgs(mappedOrgs);
        
        // Default to first org if available and none selected
        if (mappedOrgs.length > 0 && !currentOrg) {
          setCurrentOrg(mappedOrgs[0]);
        }
      }
    };
    fetchOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleOrgSwitch = (org: OrgSimple) => {
    setCurrentOrg(org);
    setIsOrgMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Gallery', href: '/gallery', icon: LayoutTemplate },
    { name: 'Organization', href: '/organization', icon: Building2 }, // Updated Link
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
          {/* Organization Switcher */}
          {userOrgs.length > 0 && (
            <div className="p-4 bg-slate-950 relative" ref={orgMenuRef}>
              <button 
                onClick={() => setIsOrgMenuOpen(!isOrgMenuOpen)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <span className="flex items-center gap-2 truncate">
                  <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-xs shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">{currentOrg?.name || 'Select Org'}</span>
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {isOrgMenuOpen && (
                <div className="absolute left-4 right-4 top-16 z-20 mt-1 origin-top-right rounded-md bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-slate-700">
                  <div className="py-1">
                    {userOrgs.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => handleOrgSwitch(org)}
                        className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        <span className="truncate">{org.name}</span>
                        {currentOrg?.id === org.id && <Check className="w-4 h-4 text-blue-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
        {/* Pass currentOrg down to children via Context */}
        <Outlet context={{ currentOrg }} />
      </main>
    </div>
  );
};