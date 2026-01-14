import React, { useMemo } from 'react';
import { FileSpreadsheet, Search, Clock, Edit, Trash2 } from 'lucide-react';
import { WorkflowTableProps } from './types';
import { Input } from '../ui/Input';
import { Table } from '../ui/Table';

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
    <>
      <div className="flex items-center mb-6">
        <Input
          placeholder="Search workflows..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          prefix={<Search className="w-4 h-4" />}
          className="max-w-sm"
        />
      </div>

      <Table>
        <div className="min-w-full divide-y divide-slate-200">
          <div className="bg-slate-50 grid grid-cols-12 gap-4 px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
            <div className="col-span-4">Name</div>
            <div className="col-span-3">Owner</div>
            <div className="col-span-3">Created</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <div className="divide-y divide-slate-200 bg-white">
            {loading ? (
              <div className="px-6 py-10 text-center text-slate-500">Loading workflows...</div>
            ) : error ? (
              <div className="px-6 py-10 text-center text-red-600">{error}</div>
            ) : filtered.length > 0 ? (
              filtered.map((workflow) => (
                <div key={workflow.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 transition-colors">
                  <div className="col-span-4 flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3 text-blue-600">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">
                        {workflow.name}
                      </div>
                      <span className="text-xs text-slate-500">ID: {workflow.id}</span>
                    </div>
                  </div>
                  <div className="col-span-3 text-sm text-slate-600 flex items-center">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center mr-2 text-xs font-bold text-slate-500">
                      {workflow.owner_id ? workflow.owner_id.charAt(0).toUpperCase() : '?'}
                    </div>
                    <span className="truncate" title={workflow.owner_id}>{workflow.owner_id || 'Unknown'}</span>
                  </div>
                  <div className="col-span-3 text-sm text-slate-500 flex items-center">
                    <Clock className="w-4 h-4 mr-1.5 text-slate-400" />
                    {formatDate(workflow.created_at)}
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <button
                      onClick={() => onEdit(workflow.id)}
                      className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(workflow.id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center text-slate-500">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p>No workflows found in this view.</p>
              </div>
            )}
          </div>
        </div>
      </Table>
    </>
  );
};
