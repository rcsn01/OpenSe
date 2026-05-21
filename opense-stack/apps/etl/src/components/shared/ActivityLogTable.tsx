import { useMemo } from 'react';
import { Clock, FileSpreadsheet } from 'lucide-react';
import {
  DataTable,
  EmptyState,
  Spinner,
  StatusBadge,
  type DataTableColumn,
} from '@repo/ui';
import { searchTextFields } from '../../lib/pageSearch';

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
  search?: string;
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

const renderStatus = (status: ExecutionLog['status']) => {
  if (status === 'success') {
    return <StatusBadge label="Success" tone="success" />;
  }

  if (status === 'running') {
    return <StatusBadge label="Running" tone="neutral" />;
  }

  return <StatusBadge label="Failed" tone="danger" />;
};

export const ActivityLogTable = ({
  logs,
  loading,
  search = '',
  emptyMessage = 'No activities recorded.',
}: ActivityLogTableProps) => {
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => searchTextFields([
      log.workflows?.name,
      log.profiles?.full_name,
      log.profiles?.email,
      log.status,
      log.error_message,
    ], search));
  }, [logs, search]);

  const columns = useMemo<Array<DataTableColumn<ExecutionLog>>>(() => [
    {
      id: 'status',
      header: 'Status',
      renderCell: (log) => renderStatus(log.status),
      width: 130,
    },
    {
      id: 'workflow',
      header: 'Workflow',
      renderCell: (log) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            <span className="truncate text-sm font-medium text-[var(--color-foreground)]">
              {log.workflows?.name || 'Unknown Workflow'}
            </span>
          </div>
          {log.error_message ? (
            <p className="mt-1 max-w-xs truncate text-xs text-[var(--color-destructive)]" title={log.error_message}>
              {log.error_message}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: 'user',
      header: 'User',
      renderCell: (log) => (
        <span className="text-sm text-[var(--color-foreground)]">
          {log.profiles?.full_name || log.profiles?.email || 'Unknown'}
        </span>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      renderCell: (log) => (
        <span className="text-sm text-[var(--color-muted-foreground)]">{formatDate(log.started_at)}</span>
      ),
    },
    {
      id: 'duration',
      header: 'Duration',
      renderCell: (log) => (
        <span className="flex items-center gap-1 text-sm text-[var(--color-muted-foreground)]">
          <Clock className="h-3.5 w-3.5" />
          {formatDuration(log.started_at, log.completed_at)}
        </span>
      ),
    },
  ], []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] px-6 py-12 text-sm text-[var(--color-muted-foreground)]">
        <Spinner size="sm" />
        Loading logs...
      </div>
    );
  }

  if (filteredLogs.length === 0) {
    const hasSearch = search.trim().length > 0;

    return (
      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] px-6 py-14">
        <EmptyState
          title="No activity logs found"
          description={hasSearch ? `No results for "${search.trim()}".` : emptyMessage}
        />
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      rows={filteredLogs}
      getRowId={(log) => log.id}
      variant="operational"
      minTableWidth={780}
      className="rounded-[var(--radius-xl)] border border-[var(--color-border)]"
    />
  );
};
