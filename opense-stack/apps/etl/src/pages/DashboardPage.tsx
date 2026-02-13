import { useEffect } from 'react';
import { useOutletContext, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@repo/shared/auth/context';
import { BasePage } from '@repo/ui';
import { OrgSimple } from '../types/organisation';
import { User, Building2 } from 'lucide-react';
import { Tabs } from '../components/ui/Tabs';

type DashboardContextType = {
  currentOrg: OrgSimple | null;
  dashboardSearch?: string;
  setDashboardSearch?: (value: string) => void;
};

export const DashboardPage = () => {
  const { user } = useAuth();
  const { currentOrg, dashboardSearch, setDashboardSearch } = useOutletContext<DashboardContextType>();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname.startsWith('/dashboard/org')) {
      localStorage.setItem('dashboardLastTab', 'org');
    } else if (location.pathname.startsWith('/dashboard/personal')) {
      localStorage.setItem('dashboardLastTab', 'personal');
    }
  }, [location.pathname]);

  // Pass context down to Outlet (WorkflowList)
  return (
    <BasePage>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.user_metadata?.full_name || 'Guest'}</h1>
          <p className="text-slate-500 mt-1">Manage your data workflows and automations.</p>
        </div>
      </div>

      {/* URL-based Tabs */}
      <Tabs
        tabs={[
          { id: 'personal', label: 'Personal', icon: <User className="w-4 h-4" /> },
          { id: 'org', label: currentOrg ? currentOrg.name : 'Organization', icon: <Building2 className="w-4 h-4" /> },
        ]}
        activeTab={location.pathname.split('/').pop() || 'personal'}
        onTabChange={(id) => navigate(id)}
      />

      <Outlet context={{ currentOrg, dashboardSearch, setDashboardSearch }} />
    </BasePage>
  );
};
