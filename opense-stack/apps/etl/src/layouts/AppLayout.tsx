import { useState, useEffect } from 'react';
import { Outlet, useLocation, Navigate, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  LayoutTemplate,
  Building2,
  Activity
} from 'lucide-react';
import { AppSidebar, AppSidebarLinkProvider, type NavGroup } from '@repo/ui';
import { useAuth } from '../context/AuthContext';
import { OrgSimple, useUserOrganisations } from '../hooks/queries/useOrganisations';

/** Adapter: renders react-router <Link> instead of plain <a> */
const linkRenderer = {
  renderLink: ({ href, className, onClick, children, key }: any) => (
    <Link key={key} to={href} className={className} onClick={onClick}>
      {children}
    </Link>
  ),
};

export const AppLayout = () => {
  const { session, user, loading, isDemoUser, logout } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const location = useLocation();

  // Org State
  const [currentOrg, setCurrentOrg] = useState<OrgSimple | null>(null);
  const { data: userOrgs = [] } = useUserOrganisations(user?.id);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await logout();
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

  if (!session && !isDemoUser && !loading) {
    return <Navigate to="/login" replace />;
  }

  const navigation: NavGroup[] = [
    {
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: 'Gallery', href: '/gallery', icon: <LayoutTemplate className="w-5 h-5" /> },
        { label: 'Organisation', href: '/organisation', icon: <Building2 className="w-5 h-5" /> },
        { label: 'Activity', href: '/activity', icon: <Activity className="w-5 h-5" /> },
      ],
    },
  ];

  const orgHeader = currentOrg ? (
    <div className="flex items-center w-full px-3 py-2 text-sm font-medium text-[var(--sidebar-text)] bg-[var(--sidebar-hover)] rounded-md border border-[var(--sidebar-border)]">
      <div className="flex items-center gap-2 truncate">
        <div className="w-6 h-6 bg-[var(--color-primary)] rounded flex items-center justify-center text-xs shrink-0 text-white">
          <Building2 className="w-3.5 h-3.5" />
        </div>
        <span className="truncate">{currentOrg.name}</span>
      </div>
    </div>
  ) : (
    <div className="px-3 py-2 text-xs text-[var(--sidebar-muted)] text-center border border-dashed border-[var(--sidebar-border)] rounded-md">
      No Organisation
    </div>
  );

  return (
    <AppSidebarLinkProvider value={linkRenderer}>
      <AppSidebar
        brandName="Open-ETL"
        brandLogo="OE"
        navigation={navigation}
        currentPath={location.pathname}
        onNavigate={(href) => navigate(href)}
        userName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
        userEmail={user?.email || 'user@example.com'}
        onSignOut={handleSignOut}
        signingOut={signingOut}
        headerSlot={orgHeader}
      >
        <Outlet context={{ currentOrg }} />
      </AppSidebar>
    </AppSidebarLinkProvider>
  );
};
