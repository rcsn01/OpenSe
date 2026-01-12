import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Droplet } from 'lucide-react'
import { FillMissingNodeData } from './types'

export const FillMissingNode = ({ data }: NodeProps<FillMissingNodeData>) => (
  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-64">
    <Handle type="target" position={Position.Left} id="in" className="!bg-slate-400" />
    <Handle type="source" position={Position.Right} id="out" className="!bg-cyan-500" />
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-md bg-cyan-100 text-cyan-700"><Droplet className="w-4 h-4" /></div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{data.label || 'Fill Missing'}</p>
        <p className="text-xs text-slate-500">Handle null / empty values</p>
      </div>
    </div>
    <div className="space-y-2 text-xs text-slate-700">
      {data.availableFields?.length ? (
        <select
          className="w-full rounded-md border border-slate-200 px-2 py-1"
          value={data.field || ''}
          onChange={(e) => data.setData?.((prev: FillMissingNodeData) => ({ ...prev, field: e.target.value }))}
        >
          <option value="">Select column...</option>
          {data.availableFields.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      ) : (
        <input
          className="w-full rounded-md border border-slate-200 px-2 py-1"
          placeholder="Column name"
          value={data.field || ''}
          onChange={(e) => data.setData?.((prev: FillMissingNodeData) => ({ ...prev, field: e.target.value }))}
        />
      )}
      <select
        className="w-full rounded-md border border-slate-200 px-2 py-1"
        value={data.strategy}
        onChange={(e) => data.setData?.((prev: FillMissingNodeData) => ({ ...prev, strategy: e.target.value as FillMissingNodeData['strategy'] }))}
      >
        <option value="static">Static value</option>
        <option value="mean">Mean (numeric)</option>
        <option value="median">Median (numeric)</option>
        <option value="ffill">Forward fill</option>
      </select>
      {data.strategy === 'static' && (
        <input
          className="w-full rounded-md border border-slate-200 px-2 py-1"
          placeholder="Value"
          value={data.value || ''}
          onChange={(e) => data.setData?.((prev: FillMissingNodeData) => ({ ...prev, value: e.target.value }))}
        />
      )}
    </div>
  </div>
)
