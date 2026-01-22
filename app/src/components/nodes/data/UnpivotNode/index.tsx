import React, { useMemo } from 'react';
import { NodeProps } from 'reactflow';
import { GitBranch } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { UnpivotNodeData } from '../../types';

export const UnpivotNode = ({ data, selected }: NodeProps<UnpivotNodeData>) => {
  const available = data.availableFields || [];
  const keep = useMemo(() => data.keepColumns || [], [data.keepColumns]);
  const melt = useMemo(() => data.pivotColumns || [], [data.pivotColumns]);

  const toggle = (field: string, target: 'keep' | 'pivot') => {
    data.setData?.((prev: UnpivotNodeData) => {
      const current = target === 'keep' ? (prev.keepColumns || []) : (prev.pivotColumns || []);
      const next = current.includes(field) ? current.filter((f) => f !== field) : [...current, field];
      return target === 'keep'
        ? { ...prev, keepColumns: next }
        : { ...prev, pivotColumns: next };
    });
  };

  return (
    <BaseNode
      label={data.label || 'Unpivot (Melt)'}
      description="Select keep + melt columns"
      icon={GitBranch}
      color="bg-rose-500"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
      className="w-72"
    >
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Keep</span><span>{keep.length}</span>
          </div>
          <div
            className="max-h-32 overflow-y-auto space-y-1 pr-1"
            onWheelCapture={(e) => e.stopPropagation()}
          >
            {available.map((field) => (
              <label key={field} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={keep.includes(field)}
                  onChange={() => toggle(field, 'keep')}
                  className="rounded border-slate-300"
                />
                <span className="truncate" title={field}>{field}</span>
              </label>
            ))}
            {!available.length && <p className="text-[11px] text-slate-500">Connect data to select.</p>}
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Melt</span><span>{melt.length}</span>
          </div>
          <div
            className="max-h-32 overflow-y-auto space-y-1 pr-1"
            onWheelCapture={(e) => e.stopPropagation()}
          >
            {available.map((field) => (
              <label key={field} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={melt.includes(field)}
                  onChange={() => toggle(field, 'pivot')}
                  className="rounded border-slate-300"
                />
                <span className="truncate" title={field}>{field}</span>
              </label>
            ))}
            {!available.length && <p className="text-[11px] text-slate-500">Connect data to select.</p>}
          </div>
        </div>
      </div>
      <div className="text-[11px] text-slate-500">Output columns: Variable, Value</div>
    </BaseNode>
  );
};
