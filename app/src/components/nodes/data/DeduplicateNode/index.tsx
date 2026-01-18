import React, { useMemo } from 'react';
import { NodeProps } from 'reactflow';
import { Copy } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { DeduplicateNodeData } from '../../types';

export const DeduplicateNode = ({ data, selected }: NodeProps<DeduplicateNodeData>) => {
  const available = data.availableFields || [];
  const selectedKeys = useMemo(() => data.keys || [], [data.keys]);

  const toggle = (field: string) => {
    data.setData?.((prev: DeduplicateNodeData) => {
      const current = prev.keys || [];
      const next = current.includes(field) ? current.filter((f) => f !== field) : [...current, field];
      return { ...prev, keys: next };
    });
  };

  const selectAll = () => {
    if (!available.length) return;
    data.setData?.((prev: DeduplicateNodeData) => ({ ...prev, keys: [...available] }));
  };

  const deselectAll = () => {
    data.setData?.((prev: DeduplicateNodeData) => ({ ...prev, keys: [] }));
  };

  return (
    <BaseNode
      label={data.label || 'Deduplicate'}
      description="Select keys to keep unique"
      icon={Copy}
      color="bg-amber-500"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
    >
      {available.length ? (
        <div className="space-y-2 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <button className="flex-1 rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50" onClick={selectAll}>Select all</button>
            <button className="flex-1 rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50" onClick={deselectAll}>De-select all</button>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1 pr-1" onWheel={(e) => e.stopPropagation()}>
            {available.map((field) => (
              <label key={field} className="flex items-center gap-2">
                <input type="checkbox" checked={selectedKeys.includes(field)} onChange={() => toggle(field)} className="rounded border-slate-300" />
                <span className="truncate" title={field}>{field}</span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Connect a source to pick keys.</p>
      )}
      <div className="text-[11px] text-slate-500">{selectedKeys.length ? `${selectedKeys.length} key(s)` : 'Using entire row'}</div>
    </BaseNode>
  );
};
