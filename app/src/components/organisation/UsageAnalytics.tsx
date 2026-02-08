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

const COLORS = {
  success: '#10b981',
  failed: '#ef4444',
  running: '#f59e0b',
  primary: '#3b82f6',
  muted: '#94a3b8',
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
          <span className="text-slate-500 text-sm">Loading analytics...</span>
        </div>
      )}

      {!isLoading && (
        <>
          {/* ── Metric Cards ── */}
          <div className={`grid grid-cols-1 md:grid-cols-2 ${hideActiveUsers ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-5`}>
            <MetricCard
              icon={Activity}
              iconColor="bg-blue-50 text-blue-600"
              label="Total Executions (30d)"
              value={usageStats?.total?.toLocaleString() || '0'}
            />
            <MetricCard
              icon={CheckCircle}
              iconColor="bg-green-50 text-green-600"
              label="Success Rate"
              value={usageStats ? `${usageStats.successRate}%` : '—'}
              subtitle={usageStats ? `${usageStats.success.toLocaleString()} successful` : undefined}
            />
            <MetricCard
              icon={XCircle}
              iconColor="bg-red-50 text-red-600"
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
                iconColor="bg-purple-50 text-purple-600"
                label="Active Users (30d)"
                value={activeUsers.length.toString()}
                subtitle={activeUsers.length > 0 ? `Top: ${activeUsers[0]?.full_name || activeUsers[0]?.email || 'N/A'}` : undefined}
              />
            )}
          </div>

          {/* ── Charts Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Execution Volume */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-slate-600" />
                <h3 className="text-base font-bold text-slate-900">Execution Volume</h3>
              </div>
              {chartData.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)', fontSize: 12 }}
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
            </div>

            {/* Execution Status Breakdown */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-slate-600" />
                <h3 className="text-base font-bold text-slate-900">Status Breakdown</h3>
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
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)', fontSize: 12 }}
                      />
                      <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs text-slate-600">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="No execution data to display." />
              )}
            </div>
          </div>

          {/* ── Trend Chart ── */}
          {chartData.length > 1 && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-slate-600" />
                <h3 className="text-base font-bold text-slate-900">Execution Trend</h3>
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
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)', fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="total" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} name="Total" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Active Users Table ── */}
          {!hideActiveUsers && activeUsers.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-600" />
                  <h3 className="text-base font-bold text-slate-900">Active Users (Last 30 Days)</h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-6 py-3 font-semibold">User</th>
                      <th className="text-left px-6 py-3 font-semibold">Executions</th>
                      <th className="text-left px-6 py-3 font-semibold">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeUsers.map((u) => (
                      <tr key={u.user_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3">
                          <div>
                            <p className="font-medium text-slate-800">{u.full_name || 'No name'}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                            {u.execution_count}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-slate-500 text-xs">
                          {new Date(u.last_active).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
    <div className="flex items-center gap-3 mb-3">
      <div className={`p-2 rounded-lg ${iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>
      <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</h3>
    </div>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
  </div>
);

const EmptyChart = ({ message }: { message: string }) => (
  <div className="h-[280px] flex flex-col items-center justify-center text-slate-400">
    <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
    <p className="text-sm">{message}</p>
  </div>
);
