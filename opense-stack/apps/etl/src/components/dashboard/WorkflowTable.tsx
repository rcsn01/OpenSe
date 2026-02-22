import { useMemo } from 'react';
import { CalendarDays, FileSpreadsheet, Loader2, Trash2 } from 'lucide-react';
import { WorkflowTableProps } from './types';

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const truncateText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
};

export const WorkflowTable: React.FC<WorkflowTableProps> = ({
  workflows,
  loading,
  error,
  search,
  onSearchChange,
  onEdit,
  onDelete,
}) => {
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return workflows;
    return workflows.filter((w) => w.name.toLowerCase().includes(term));
  }, [workflows, search]);

  const hasSearch = search.trim().length > 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {loading ? (
        <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          Loading workflows...
        </div>
      ) : error ? (
        <div className="px-6 py-10">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-6 py-14 text-center text-slate-500">
          <FileSpreadsheet className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-base font-medium text-slate-700">No workflows found</p>
          <p className="mt-1 text-sm text-slate-500">
            {hasSearch ? `No results for “${search.trim()}”.` : 'Create your first draft workflow to get started.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50/80">
              <tr className="border-b border-slate-200">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 sm:px-6">Workflow</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Owner</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Created</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 sm:px-6">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((workflow) => {
                const ownerLabel =
                  workflow.owner?.full_name || workflow.owner?.email || workflow.owner_id || 'Unknown';
                const ownerInitial = ownerLabel?.charAt(0).toUpperCase() || '?';
                const workflowName = truncateText(workflow.name, 22);
                const workflowId = truncateText(workflow.id, 22);

                return (
                  <tr
                    key={workflow.id}
                    className="group cursor-pointer border-b border-slate-100 transition hover:bg-slate-50/70"
                    role="button"
                    tabIndex={0}
                    onClick={() => onEdit(workflow.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onEdit(workflow.id);
                      }
                    }}
                  >
                    <td className="px-5 py-3 align-middle sm:px-6">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900" title={workflow.name}>{workflowName}</p>
                        <p className="truncate text-xs text-slate-500" title={workflow.id}>{workflowId}</p>
                      </div>
                    </td>

                    <td className="px-5 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                          {ownerInitial}
                        </div>
                        <p className="max-w-[180px] truncate text-sm text-slate-700">{ownerLabel}</p>
                      </div>
                    </td>

                    <td className="px-5 py-3 align-middle text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        {formatDate(workflow.created_at)}
                      </div>
                    </td>

                    <td className="px-5 py-3 align-middle">
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Draft
                      </span>
                    </td>

                    <td className="px-5 py-3 align-middle sm:px-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            onDelete(workflow.id);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50"
                          type="button"
                          aria-label="Delete workflow"
                          title="Delete workflow"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
