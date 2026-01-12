import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { ArrowDownUp } from 'lucide-react'
import { SortNodeData } from './types'

export const SortNode = ({ data }: NodeProps<SortNodeData>) => (
  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-64">
    <Handle type="target" position={Position.Left} id="in" className="!bg-slate-400" />
    <Handle type="source" position={Position.Right} id="out" className="!bg-indigo-600" />
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-md bg-indigo-100 text-indigo-700"><ArrowDownUp className="w-4 h-4" /></div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{data.label || 'Sort'}</p>
        <p className="text-xs text-slate-500">Order rows by a column</p>
      </div>
    </div>
    <div className="space-y-2 text-xs text-slate-700">
      {data.availableFields?.length ? (
        <select
          className="w-full rounded-md border border-slate-200 px-2 py-1"
          value={data.field || ''}
          onChange={(e) => data.setData?.((prev: SortNodeData) => ({ ...prev, field: e.target.value }))}
        >
          <option value="">Select column...</option>
          {data.availableFields.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      ) : (
        <input
          className="w-full rounded-md border border-slate-200 px-2 py-1"
          placeholder="Column name"
          value={data.field || ''}
          onChange={(e) => data.setData?.((prev: SortNodeData) => ({ ...prev, field: e.target.value }))}
        />
      )}
      <select
        className="w-full rounded-md border border-slate-200 px-2 py-1"
        value={data.direction}
        onChange={(e) => data.setData?.((prev: SortNodeData) => ({ ...prev, direction: e.target.value as SortNodeData['direction'] }))}
      >
        <option value="asc">Ascending</option>
        <option value="desc">Descending</option>
      </select>
    </div>
  </div>
)
