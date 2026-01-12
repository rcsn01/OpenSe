import React, { useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Scissors } from 'lucide-react';
import { RemoveNodeData } from './types';

export const FilterColumn = ({ data }: NodeProps<RemoveNodeData>) => {
  const available = data.availableFields || [];
  const selected = useMemo(() => data.selectedFields || (data.field ? [data.field] : []), [data.selectedFields, data.field]);

  const toggle = (field: string) => {
    data.setData?.((prev: RemoveNodeData) => {
      const current = prev.selectedFields || (prev.field ? [prev.field] : []);
      const next = current.includes(field)
        ? current.filter((f) => f !== field)
        : [...current, field];
      return { ...prev, selectedFields: next, field: undefined };
    });
  };

  const selectAll = () => {
    if (!available.length) return;
    data.setData?.((prev: RemoveNodeData) => ({ ...prev, selectedFields: [...available], field: undefined }));
  };

  const deselectAll = () => {
    data.setData?.((prev: RemoveNodeData) => ({ ...prev, selectedFields: [], field: undefined }));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-64">
      <Handle type="target" position={Position.Left} id="in" className="!bg-slate-400" />
      <Handle type="source" position={Position.Right} id="out" className="!bg-orange-500" />
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-md bg-orange-100 text-orange-700"><Scissors className="w-4 h-4" /></div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{data.label || 'Filter Columns'}</p>
          <p className="text-xs text-slate-500">Select columns to keep</p>
        </div>
      </div>

      {available.length ? (
        <div className="space-y-2 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex-1 rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50"
              onClick={selectAll}
            >
              Select all
            </button>
            <button
              type="button"
              className="flex-1 rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50"
              onClick={deselectAll}
            >
              De-select all
            </button>
          </div>

          <div
            className="max-h-32 overflow-y-auto space-y-1 pr-1"
            onWheel={(e) => e.stopPropagation()}
          >
            {available.map((field) => (
              <label key={field} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.includes(field)}
                  onChange={() => toggle(field)}
                  className="rounded border-slate-300"
                />
                <span className="truncate" title={field}>{field}</span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <input
          className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
          placeholder="Column name (fallback)"
          value={selected[0] || ''}
          onChange={(e) => data.setData?.((prev: RemoveNodeData) => ({ ...prev, field: e.target.value, selectedFields: undefined }))}
        />
      )}

      <div className="mt-2 text-[11px] text-slate-500">{selected.length ? `${selected.length} column(s) kept` : 'Keeping all columns'}</div>
    </div>
  );
};
