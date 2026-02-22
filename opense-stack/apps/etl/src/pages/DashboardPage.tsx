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
