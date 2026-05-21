import { useMemo } from 'react';
import { CalendarDays, Trash2 } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Label,
  Spinner,
  SubLabel,
  type DataTableColumn,
} from '@repo/ui';
import { type WorkflowRow, type WorkflowTableProps } from './types';

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const truncateText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
};

export const WorkflowTable = ({
  workflows,
  loading,
  error,
  search,
  onEdit,
  onDelete,
}: WorkflowTableProps) => {
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return workflows;
    return workflows.filter((w) => w.name.toLowerCase().includes(term));
  }, [workflows, search]);

  const hasSearch = search.trim().length > 0;
  const columns = useMemo<Array<DataTableColumn<WorkflowRow>>>(() => [
    {
      id: 'workflow',
      header: 'Workflow',
      renderCell: (workflow) => {
        const workflowName = truncateText(workflow.name, 22);
        const workflowId = truncateText(workflow.id, 22);

        return (
          <div className="min-w-0">
            <Label className="block truncate" title={workflow.name}>{workflowName}</Label>
            <SubLabel as="div" className="block truncate" title={workflow.id}>{workflowId}</SubLabel>
          </div>
        );
      },
    },
    {
      id: 'owner',
      header: 'Owner',
      renderCell: (workflow) => {
        const ownerLabel = workflow.owner?.full_name || workflow.owner?.email || workflow.owner_id || 'Unknown';
        const ownerInitial = ownerLabel.charAt(0).toUpperCase() || '?';

        return (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-muted)] text-xs font-semibold text-[var(--color-muted-foreground)]">
              {ownerInitial}
            </div>
            <p className="max-w-[180px] truncate text-sm text-[var(--color-foreground)]">{ownerLabel}</p>
          </div>
        );
      },
    },
    {
      id: 'created',
      header: 'Created',
      renderCell: (workflow) => (
        <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
          <CalendarDays className="h-4 w-4" />
          {formatDate(workflow.created_at)}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      renderCell: () => <Badge variant="success">Draft</Badge>,
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      renderCell: (workflow) => (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(workflow.id);
          }}
          aria-label={`Delete ${workflow.name}`}
          title="Delete workflow"
          className="text-[var(--color-destructive)] hover:text-[var(--color-destructive)]"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ], [onDelete]);

  return (
    <section className="min-h-0 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-table-row-bg)]">
      {loading ? (
        <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-[var(--color-muted-foreground)]">
          <Spinner size="sm" />
          Loading workflows...
        </div>
      ) : error ? (
        <div className="px-6 py-10">
          <Alert variant="destructive">{error}</Alert>
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-6 py-14">
          <EmptyState
            title="No workflows found"
            description={hasSearch ? `No results for "${search.trim()}".` : 'Create your first draft workflow to get started.'}
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          getRowId={(workflow) => workflow.id}
          variant="operational"
          minTableWidth={760}
          onRowClick={(workflow) => onEdit(workflow.id)}
          rowClassName="cursor-pointer transition-colors hover:bg-[var(--color-muted)]/60"
          getRowProps={(workflow) => ({
            role: 'button',
            tabIndex: 0,
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onEdit(workflow.id);
              }
            },
          })}
        />
      )}
    </section>
  );
};
