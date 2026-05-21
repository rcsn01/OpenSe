import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { Activity, CheckCircle, XCircle, Users, TrendingUp, Loader2, BarChart3 } from 'lucide-react';
import { OrgSimple } from '../../types/organisation';
import { useOutletContext } from 'react-router-dom';
import { useOrgUsageStats, useOrgActiveUsers } from '../../hooks/queries/useUsageStats';
import { UsageSummary, ActiveUser } from '../../api/usage';
import { Card, DataTable, type DataTableColumn } from '@repo/ui';

const COLORS = {
  success: 'var(--color-success)',
  failed: 'var(--color-destructive)',
  running: 'var(--color-warning)',
  primary: 'var(--color-primary)',
  muted: 'var(--color-muted-foreground)',
};

const PIE_COLORS = [COLORS.success, COLORS.failed, COLORS.running];

// ── Presentational Component (accepts data as props) ──

type UsageChartsProps = {
  usageStats: UsageSummary | null;
  activeUsers?: ActiveUser[];
  isLoading: boolean;
  /** Hide the Active Users table (e.g. for personal view) */
  hideActiveUsers?: boolean;
};

export const UsageCharts = ({ usageStats, activeUsers = [], isLoading, hideActiveUsers }: UsageChartsProps) => {
  const chartData = useMemo(() => {
    if (!usageStats?.dailyStats?.length) return [];
    return usageStats.dailyStats.map((d) => ({
      name: new Date(d.daily_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      total: d.daily_total,
      success: d.daily_success,
      failed: d.daily_failed,
    }));
  }, [usageStats]);

  const statusData = useMemo(() => {
    if (!usageStats) return [];
    return [
      { name: 'Success', value: usageStats.success },
      { name: 'Failed', value: usageStats.failed },
    ].filter((d) => d.value > 0);
  }, [usageStats]);
  const activeUserColumns = useMemo<Array<DataTableColumn<ActiveUser>>>(() => [
    {
      id: 'user',
      header: 'User',
      renderCell: (user) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-[var(--color-foreground)]">{user.full_name || 'No name'}</p>
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">{user.email}</p>
        </div>
      ),
    },
    {
      id: 'executions',
      header: 'Executions',
      renderCell: (user) => (
        <span className="text-sm font-medium text-[var(--color-foreground)]">{user.execution_count}</span>
      ),
    },
    {
      id: 'lastActive',
      header: 'Last Active',
      renderCell: (user) => (
        <span className="text-sm text-[var(--color-muted-foreground)]">
          {new Date(user.last_active).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
  ], []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-[var(--color-primary)]" />
          <span className="text-sm text-[var(--color-muted-foreground)]">Loading analytics...</span>
        </div>
      )}

      {!isLoading && (
        <>
          {/* ── Metric Cards ── */}
          <div className={`grid grid-cols-1 md:grid-cols-2 ${hideActiveUsers ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-5`}>
            <MetricCard
              icon={Activity}
              iconColor="bg-[var(--color-muted)] text-[var(--color-primary)]"
              label="Total Executions (30d)"
              value={usageStats?.total?.toLocaleString() || '0'}
            />
            <MetricCard
              icon={CheckCircle}
              iconColor="bg-[var(--color-success-light)] text-[var(--color-success)]"
              label="Success Rate"
              value={usageStats ? `${usageStats.successRate}%` : '—'}
              subtitle={usageStats ? `${usageStats.success.toLocaleString()} successful` : undefined}
            />
            <MetricCard
              icon={XCircle}
              iconColor="bg-[var(--color-destructive-light)] text-[var(--color-destructive)]"
              label="Failed Runs"
              value={usageStats?.failed?.toLocaleString() || '0'}
              subtitle={usageStats && usageStats.total > 0
                ? `${Math.round((usageStats.failed / usageStats.total) * 100)}% failure rate`
                : undefined
              }
            />
            {!hideActiveUsers && (
              <MetricCard
                icon={Users}
                iconColor="bg-[var(--color-muted)] text-[var(--color-secondary)]"
                label="Active Users (30d)"
                value={activeUsers.length.toString()}
                subtitle={activeUsers.length > 0 ? `Top: ${activeUsers[0]?.full_name || activeUsers[0]?.email || 'N/A'}` : undefined}
              />
            )}
          </div>

          {/* ── Charts Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Execution Volume */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-[var(--color-muted-foreground)]" />
                <h3 className="text-base font-semibold text-[var(--color-foreground)]">Execution Volume</h3>
              </div>
              {chartData.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 'var(--type-size-xs)' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 'var(--type-size-xs)' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)', fontSize: 'var(--type-size-xs)' }}
                        cursor={{ fill: '#F1F5F9' }}
                      />
                      <Bar dataKey="success" stackId="a" fill={COLORS.success} radius={[0, 0, 0, 0]} name="Success" />
                      <Bar dataKey="failed" stackId="a" fill={COLORS.failed} radius={[4, 4, 0, 0]} name="Failed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="No execution data in the last 30 days." />
              )}
            </Card>

            {/* Execution Status Breakdown */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-[var(--color-muted-foreground)]" />
                <h3 className="text-base font-semibold text-[var(--color-foreground)]">Status Breakdown</h3>
              </div>
              {statusData.length > 0 ? (
                <div className="h-[280px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)', fontSize: 'var(--type-size-xs)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs text-[var(--color-muted-foreground)]">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="No execution data to display." />
              )}
            </Card>
          </div>

          {/* ── Trend Chart ── */}
          {chartData.length > 1 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-[var(--color-muted-foreground)]" />
                <h3 className="text-base font-semibold text-[var(--color-foreground)]">Execution Trend</h3>
              </div>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 'var(--type-size-xs)' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 'var(--type-size-xs)' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)', fontSize: 'var(--type-size-xs)' }}
                    />
                    <Area type="monotone" dataKey="total" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} name="Total" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* ── Active Users Table ── */}
          {!hideActiveUsers && activeUsers.length > 0 && (
            <Card className="overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)]" padding="none">
              <div className="border-b border-[var(--color-border)] p-5">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[var(--color-muted-foreground)]" />
                  <h3 className="text-base font-semibold text-[var(--color-foreground)]">Active Users (Last 30 Days)</h3>
                </div>
              </div>
              <DataTable
                columns={activeUserColumns}
                rows={activeUsers}
                getRowId={(user) => user.user_id}
                variant="operational"
                minTableWidth={620}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
};

// ── OrgUsageAnalytics Wrapper (fetches data for an org) ──

type OrgUsageAnalyticsProps = {
  organisation?: OrgSimple;
};

export const OrgUsageAnalytics = ({ organisation: propOrg }: OrgUsageAnalyticsProps) => {
  const context = useOutletContext<{ currentOrg: OrgSimple }>();
  const organisation = propOrg || context?.currentOrg;

  const { data: usageStats = null, isLoading: statsLoading } = useOrgUsageStats(organisation?.id);
  const { data: activeUsers = [], isLoading: usersLoading } = useOrgActiveUsers(organisation?.id);

  if (!organisation) return null;

  return (
    <UsageCharts
      usageStats={usageStats}
      activeUsers={activeUsers}
      isLoading={statsLoading || usersLoading}
    />
  );
};

// ── Keep backward-compatible default export name ──
export const UsageAnalytics = OrgUsageAnalytics;

// ── Helper Components ──

const MetricCard = ({
  icon: Icon,
  iconColor,
  label,
  value,
  subtitle,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  value: string;
  subtitle?: string;
}) => (
  <Card className="p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className={`p-2 rounded-lg ${iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>
      <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">{label}</h3>
    </div>
    <p className="text-2xl font-semibold text-[var(--color-foreground)]">{value}</p>
    {subtitle && <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{subtitle}</p>}
  </Card>
);

const EmptyChart = ({ message }: { message: string }) => (
  <div className="h-[280px] flex flex-col items-center justify-center text-[var(--color-muted-foreground)]">
    <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
    <p className="text-sm">{message}</p>
  </div>
);
