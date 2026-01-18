import React, { useMemo } from 'react';
import { NodeProps } from 'reactflow';
import { Scissors } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { RemoveNodeData } from '../../types';

export const FilterColumn = ({ data, selected }: NodeProps<RemoveNodeData>) => {
  const available = data.availableFields || [];
  const selectedFields = useMemo(() => data.selectedFields || (data.field ? [data.field] : []), [data.selectedFields, data.field]);

  const toggle = (field: string) => {
    data.setData?.((prev: RemoveNodeData) => {
      const current = prev.selectedFields || (prev.field ? [prev.field] : []);
      const next = current.includes(field) ? current.filter((f) => f !== field) : [...current, field];
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
    <BaseNode
      label={data.label || 'Filter Columns'}
      description="Select columns to keep"
      icon={Scissors}
      color="bg-orange-500"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
    >
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
          <div className="max-h-32 overflow-y-auto space-y-1 pr-1" onWheel={(e) => e.stopPropagation()}>
            {available.map((field) => (
              <label key={field} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field)}
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
          value={selectedFields[0] || ''}
          onChange={(e) => data.setData?.((prev: RemoveNodeData) => ({ ...prev, field: e.target.value, selectedFields: undefined }))}
        />
      )}
      <div className="text-[11px] text-slate-500">{selectedFields.length ? `${selectedFields.length} column(s) kept` : 'Keeping all columns'}</div>
    </BaseNode>
  );
};
