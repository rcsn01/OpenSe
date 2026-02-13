import { useMemo } from 'react';
import { FileSpreadsheet, CalendarDays, Loader2 } from 'lucide-react';
import { StackLayout } from '@repo/ui';
import { WorkflowTableProps } from './types';

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          Loading workflows...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-10 text-center text-slate-500">
          <FileSpreadsheet className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          No workflows match that search. Try another keyword or create a new draft.
        </div>
      ) : (
        <StackLayout variant="grid">
          {filtered.map((workflow) => {
            const ownerLabel =
              workflow.owner?.full_name || workflow.owner?.email || workflow.owner_id || 'Unknown';
            const ownerInitial = ownerLabel?.charAt(0).toUpperCase() || '?';

            return (
              <div
                key={workflow.id}
                className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-lg cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => onEdit(workflow.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onEdit(workflow.id)
                  }
                }}
              >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Workflow</p>
                  <h3 className="text-lg font-semibold text-slate-900">{workflow.name}</h3>
                  <p className="text-xs text-slate-500">ID: {workflow.id}</p>
                </div>
                <div className="rounded-full border border-slate-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                  Draft
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 font-semibold text-slate-600">
                    {ownerInitial}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Owner</p>
                    <p className="text-sm text-slate-700">{ownerLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Created</p>
                    <p className="text-sm text-slate-700">{formatDate(workflow.created_at)}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  Ready to run
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      onEdit(workflow.id)
                    }}
                    className="rounded-full bg-slate-900 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-slate-800"
                    type="button"
                  >
                    Open editor
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      onDelete(workflow.id)
                    }}
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500 transition hover:text-red-600"
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        </StackLayout>
      )}
    </div>
  );
};
