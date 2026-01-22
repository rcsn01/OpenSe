import React, { useMemo } from 'react';
import { NodeProps } from 'reactflow';
import { Table } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { MultiPivotNodeData } from '../../types';
import { Select } from '../../_base/NodeControls';

export const MultiPivotNode = ({ data, selected }: NodeProps<MultiPivotNodeData>) => {
  const available = data.availableFields || [];
  const indexCols = useMemo(() => data.indexColumns || [], [data.indexColumns]);
  const valueCols = useMemo(() => data.valueColumns || [], [data.valueColumns]);

  const toggle = (field: string, listKey: 'indexColumns' | 'valueColumns') => {
    data.setData?.((prev: MultiPivotNodeData) => {
      const current = prev[listKey] || [];
      const next = current.includes(field)
        ? current.filter((f) => f !== field)
        : [...current, field];
      return { ...prev, [listKey]: next };
    });
  };

  return (
    <BaseNode
      label={data.label || 'Multi-Pivot'}
      description="Reshape to wide format"
      icon={Table}
      color="bg-emerald-800"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
      className="w-80"
    >
      <div className="space-y-3">
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Unique Target Column</label>
          {available.length ? (
            <Select
              value={data.pivotColumn || ''}
              onChange={(e) => data.setData?.((prev: MultiPivotNodeData) => ({ ...prev, pivotColumn: e.target.value }))}
            >
              <option value="">Select column...</option>
              {available.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </Select>
          ) : (
            <div className="text-xs text-slate-400 italic">Connect source to populate columns</div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 mb-1">
            <span>Index Columns</span>
            <span className="bg-slate-100 px-1.5 rounded text-[10px] text-slate-600">{indexCols.length}</span>
          </div>
          <div
            className="max-h-24 overflow-y-auto border border-slate-200 rounded-md bg-slate-50/50 p-1 space-y-0.5"
            onWheelCapture={(e) => e.stopPropagation()}
          >
            {available.length ? (
              available.map((field) => (
                <label
                  key={`idx-${field}`}
                  className="flex items-center gap-2 px-1 py-0.5 hover:bg-slate-100 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={indexCols.includes(field)}
                    onChange={() => toggle(field, 'indexColumns')}
                    className="rounded border-slate-300 w-3 h-3 text-emerald-600 focus:ring-0"
                  />
                  <span className="truncate text-xs text-slate-700" title={field}>
                    {field}
                  </span>
                </label>
              ))
            ) : (
              <p className="text-[10px] text-slate-400 px-1">No fields available</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 mb-1">
            <span>Target Sets (Values)</span>
            <span className="bg-slate-100 px-1.5 rounded text-[10px] text-slate-600">{valueCols.length}</span>
          </div>
          <div
            className="max-h-24 overflow-y-auto border border-slate-200 rounded-md bg-slate-50/50 p-1 space-y-0.5"
            onWheelCapture={(e) => e.stopPropagation()}
          >
            {available.length ? (
              available.map((field) => (
                <label
                  key={`val-${field}`}
                  className="flex items-center gap-2 px-1 py-0.5 hover:bg-slate-100 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={valueCols.includes(field)}
                    onChange={() => toggle(field, 'valueColumns')}
                    className="rounded border-slate-300 w-3 h-3 text-emerald-600 focus:ring-0"
                  />
                  <span className="truncate text-xs text-slate-700" title={field}>
                    {field}
                  </span>
                </label>
              ))
            ) : (
              <p className="text-[10px] text-slate-400 px-1">No fields available</p>
            )}
          </div>
        </div>
      </div>
    </BaseNode>
  );
};
