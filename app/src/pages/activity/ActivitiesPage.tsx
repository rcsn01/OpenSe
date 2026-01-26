import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Activity, Clock, XCircle, FileSpreadsheet, User, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Table } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/StatusBadge';
import clsx from 'clsx';
import { useExecutionLogs } from '../../hooks/queries/useActivities';

type OrgSimple = { id: string; name: string };
type DashboardContextType = { currentOrg: OrgSimple | null };

type ExecutionLog = {
  id: string;
  workflow_id: string;
  status: 'success' | 'failed' | 'running';
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  workflows: { name: string } | null;
  profiles: { email: string; full_name: string } | null;
};

export const ActivitiesPage = () => {
  const { user } = useAuth();
  const { currentOrg } = useOutletContext<DashboardContextType>();
  
  // State for active tab
  const [activeTab, setActiveTab] = useState<'personal' | 'org'>(currentOrg ? 'org' : 'personal');
  const orgIdForTab = activeTab === 'org' ? currentOrg?.id ?? null : null;
  const { data: logs = [], isLoading: loading } = useExecutionLogs(user?.id, orgIdForTab);

  // Automatically switch tab if organisation context changes
  useEffect(() => {
    if (currentOrg) {
      setActiveTab('org');
    } else {
      setActiveTab('personal');
    }
  }, [currentOrg?.id]);

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return '—';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg text-purple-700">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
          <p className="text-slate-500 text-sm">
            Monitor workflow executions and performance
          </p>
        </div>
      </div>

      <div className="border-b border-slate-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('personal')}
            className={clsx(
              'pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
              activeTab === 'personal'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            )}
          >
            <User className="w-4 h-4" />
            Personal Activities
          </button>
          {currentOrg && (
            <button
              onClick={() => setActiveTab('org')}
              className={clsx(
                'pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                activeTab === 'org'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              )}
            >
              <Building2 className="w-4 h-4" />
              {currentOrg.name} Activities
            </button>
          )}
        </nav>
      </div>

      <Table>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Workflow</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Duration</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading logs...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  {activeTab === 'org' 
                    ? `No activities recorded for ${currentOrg?.name}.` 
                    : "No personal activities recorded."}
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.status === 'success' ? (
                      <StatusBadge label="Success" tone="success" className="gap-1 pl-1" />
                    ) : log.status === 'running' ? (
                      <StatusBadge label="Running" tone="neutral" className="bg-blue-100 text-blue-800" />
                    ) : (
                      <div className="flex items-center text-red-700 bg-red-50 px-2 py-1 rounded-full text-xs font-medium w-fit">
                        <XCircle className="w-3 h-3 mr-1" /> Failed
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-900">
                        {log.workflows?.name || 'Unknown Workflow'}
                      </span>
                    </div>
                    {log.error_message && (
                      <p className="text-xs text-red-600 mt-1 max-w-xs truncate" title={log.error_message}>
                        {log.error_message}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {log.profiles?.full_name || log.profiles?.email || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {formatDate(log.started_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(log.started_at, log.completed_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Table>
    </div>
  );
};