import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Scissors } from 'lucide-react';
import { RemoveNodeData } from './types';

export const RemoveColumnNode = ({ data }: NodeProps<RemoveNodeData>) => (
  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-64">
    <Handle type="target" position={Position.Left} id="in" className="!bg-slate-400" />
    <Handle type="source" position={Position.Right} id="out" className="!bg-orange-500" />
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-md bg-orange-100 text-orange-700"><Scissors className="w-4 h-4" /></div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{data.label}</p>
        <p className="text-xs text-slate-500">Drop a column</p>
      </div>
    </div>
    <input
      className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
      placeholder="Column name (e.g. amount)"
      value={data.field}
      onChange={(e) => data.setData?.((prev: RemoveNodeData) => ({ ...prev, field: e.target.value }))}
    />
  </div>
);
