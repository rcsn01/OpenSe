import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Save as SaveIcon } from 'lucide-react';
import { SaveNodeData } from './types';

export const SaveFileNode = ({ data }: NodeProps<SaveNodeData>) => (
  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-64">
    <Handle type="target" position={Position.Left} id="in" className="!bg-slate-400" />
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-md bg-green-100 text-green-700"><SaveIcon className="w-4 h-4" /></div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{data.label}</p>
        <p className="text-xs text-slate-500">Final output</p>
      </div>
    </div>
    <div className="text-xs text-slate-600 space-y-1">
      <p>Rows saved: {data.lastSavedCsv ? 'Updated' : '—'}</p>
      {data.lastSavedCsv && <p className="truncate" title={data.lastSavedCsv}>CSV ready</p>}
    </div>
  </div>
);
