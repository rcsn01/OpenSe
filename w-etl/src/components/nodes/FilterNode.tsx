import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Filter } from 'lucide-react';
import { FilterNodeData } from './types';

export const FilterNode = ({ data }: NodeProps<FilterNodeData>) => (
  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-64">
    <Handle type="target" position={Position.Left} id="in" className="!bg-slate-400" />
    <Handle type="source" position={Position.Right} id="out" className="!bg-indigo-500" />
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-md bg-indigo-100 text-indigo-700"><Filter className="w-4 h-4" /></div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{data.label}</p>
        <p className="text-xs text-slate-500">Keep rows matching</p>
      </div>
    </div>
    <div className="space-y-2 text-xs text-slate-700">
      {data.availableFields?.length ? (
        <select
          className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
          value={data.field}
          onChange={(e) => data.setData?.((prev: FilterNodeData) => ({ ...prev, field: e.target.value }))}
        >
          <option value="">Select column...</option>
          {data.availableFields.map((field) => (
            <option key={field} value={field}>{field}</option>
          ))}
        </select>
      ) : (
        <input
          className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
          placeholder="Field (e.g. country)"
          value={data.field}
          onChange={(e) => data.setData?.((prev: FilterNodeData) => ({ ...prev, field: e.target.value }))}
        />
      )}
      <select
        className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
        value={data.operator}
        onChange={(e) => data.setData?.((prev: FilterNodeData) => ({ ...prev, operator: e.target.value as FilterNodeData['operator'] }))}
      >
        <option value="equals">equals</option>
        <option value="contains">contains</option>
      </select>
      <input
        className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
        placeholder="Value"
        value={data.value}
        onChange={(e) => data.setData?.((prev: FilterNodeData) => ({ ...prev, value: e.target.value }))}
      />
    </div>
  </div>
);
