import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BarChart3, FileText } from 'lucide-react';
import { ContentTabs } from '@repo/ui';
import { useAuth } from '@repo/shared/auth/context';
import { useExecutionLogs } from '../hooks/queries/useActivities';
import { usePersonalUsageStats } from '../hooks/queries/useUsageStats';
import { ActivityLogTable } from '../components/shared/ActivityLogTable';
import { UsageCharts } from '../components/organisation/UsageAnalytics';
import { ETLPageShell } from '../components/ETLPageShell';
import { useTopBarSearchValue } from '../components/Search/TopBarSearch';

export const ActivitiesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const activeTab: 'usage' | 'logs' = tab === 'logs' ? 'logs' : 'usage';
  const { searchValue } = useTopBarSearchValue();

  // Personal logs (org_id = null)
  const { data: logs = [], isLoading: logsLoading } = useExecutionLogs(user?.id, null);

  // Personal usage stats
  const { data: usageStats = null, isLoading: statsLoading } = usePersonalUsageStats(!!user?.id);
  const searchConfig = useMemo(() => ({
    searchKey: 'activity-logs',
    enabled: activeTab === 'logs',
    placeholder: 'Search activity...',
    emptyMessage: 'No activity found.',
    suggestions: logs.map((log) => ({
      id: log.id,
      title: log.workflows?.name || 'Unknown Workflow',
      value: log.workflows?.name || log.status,
      subtitle: log.profiles?.full_name || log.profiles?.email || undefined,
      badge: log.status,
      keywords: [
        log.status,
        log.error_message ?? '',
        log.profiles?.email ?? '',
      ],
    })),
  }), [activeTab, logs]);

  return (
    <ETLPageShell search={searchConfig}>
      <ContentTabs
        tabs={[
          {
            id: 'usage',
            label: 'Usage Analytics',
            icon: <BarChart3 className="w-4 h-4" />,
            content: (
              <UsageCharts
                usageStats={usageStats}
                isLoading={statsLoading}
                hideActiveUsers
              />
            ),
          },
          {
            id: 'logs',
            label: 'Logs (Personal)',
            icon: <FileText className="w-4 h-4" />,
            content: (
              <ActivityLogTable
                logs={logs as any}
                loading={logsLoading}
                search={searchValue}
                emptyMessage="No personal activities recorded."
              />
            ),
          },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => navigate(`/activity/${id}`)}
        bottomSpacing
        contentClassName="overflow-hidden"
      />
    </ETLPageShell>
  );
};
