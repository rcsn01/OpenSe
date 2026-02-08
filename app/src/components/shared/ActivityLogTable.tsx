import { Clock, XCircle, FileSpreadsheet } from 'lucide-react';
import { Table } from '../ui/Table';
import { StatusBadge } from '../ui/StatusBadge';

export type ExecutionLog = {
  id: string;
  workflow_id: string;
  status: 'success' | 'failed' | 'running';
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  workflows: { name: string } | null;
  profiles: { email: string; full_name: string } | null;
};

type ActivityLogTableProps = {
  logs: ExecutionLog[];
  loading: boolean;
  emptyMessage?: string;
};

const formatDuration = (start: string, end: string | null) => {
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export const ActivityLogTable = ({ logs, loading, emptyMessage = 'No activities recorded.' }: ActivityLogTableProps) => (
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
            <td colSpan={5} className="px-6 py-12 text-center text-slate-500">{emptyMessage}</td>
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
);
