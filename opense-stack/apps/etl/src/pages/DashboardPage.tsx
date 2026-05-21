import { useEffect, useMemo } from 'react';
import { useOutletContext, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ContentTabs } from '@repo/ui';
import { OrgSimple } from '../types/organisation';
import { User, Building2 } from 'lucide-react';
import { ETLPageShell } from '../components/ETLPageShell';
import { useTopBarSearchValue } from '../components/Search/TopBarSearch';

type DashboardContextType = {
  currentOrg: OrgSimple | null;
};

export const DashboardPage = () => {
  const { currentOrg } = useOutletContext<DashboardContextType>();
  const location = useLocation();
  const navigate = useNavigate();
  const { searchValue } = useTopBarSearchValue();
  const activeTab = location.pathname.startsWith('/dashboard/org') ? 'org' : 'personal';
  const searchConfig = useMemo(() => ({
    searchKey: 'dashboard-workflows',
    placeholder: 'Search workflows...',
    emptyMessage: 'No workflows found.',
  }), []);

  useEffect(() => {
    if (location.pathname.startsWith('/dashboard/org')) {
      localStorage.setItem('dashboardLastTab', 'org');
    } else if (location.pathname.startsWith('/dashboard/personal')) {
      localStorage.setItem('dashboardLastTab', 'personal');
    }
  }, [location.pathname]);

  // Pass context down to Outlet (WorkflowList)
  return (
    <ETLPageShell search={searchConfig}>
      <ContentTabs
        tabs={[
          {
            id: 'personal',
            label: 'Personal',
            icon: <User className="w-4 h-4" />,
            content: <Outlet context={{ currentOrg, dashboardSearch: searchValue }} />,
          },
          {
            id: 'org',
            label: currentOrg ? currentOrg.name : 'Organisation',
            icon: <Building2 className="w-4 h-4" />,
            content: <Outlet context={{ currentOrg, dashboardSearch: searchValue }} />,
          },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => navigate(`/dashboard/${id}`)}
        bottomSpacing
        contentClassName="overflow-hidden"
      />
    </ETLPageShell>
  );
};
