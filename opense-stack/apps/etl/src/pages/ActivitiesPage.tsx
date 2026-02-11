import { useState } from 'react';
import { BarChart3, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useExecutionLogs } from '../hooks/queries/useActivities';
import { usePersonalUsageStats } from '../hooks/queries/useUsageStats';
import { ActivityLogTable } from '../components/shared/ActivityLogTable';
import { UsageCharts } from '../components/organisation/UsageAnalytics';
import { Tabs } from '../components/ui/Tabs';

export const ActivitiesPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'usage' | 'logs'>('usage');

  // Personal logs (org_id = null)
  const { data: logs = [], isLoading: logsLoading } = useExecutionLogs(user?.id, null);

  // Personal usage stats
  const { data: usageStats = null, isLoading: statsLoading } = usePersonalUsageStats(!!user?.id);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Tabs
        tabs={[
          { id: 'usage', label: 'Usage Analytics', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'logs', label: 'Logs (Personal)', icon: <FileText className="w-4 h-4" /> },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as 'usage' | 'logs')}
      />

      {activeTab === 'usage' ? (
        <UsageCharts
          usageStats={usageStats}
          isLoading={statsLoading}
          hideActiveUsers
        />
      ) : (
        <ActivityLogTable
          logs={logs as any}
          loading={logsLoading}
          emptyMessage="No personal activities recorded."
        />
      )}
    </div>
  );
};
