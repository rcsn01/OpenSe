import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Edit3 } from 'lucide-react'
import { RenameColumnNodeData } from './types'

export const RenameColumnNode = ({ data }: NodeProps<RenameColumnNodeData>) => (
  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-64">
    <Handle type="target" position={Position.Left} id="in" className="!bg-slate-400" />
    <Handle type="source" position={Position.Right} id="out" className="!bg-yellow-500" />
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-md bg-yellow-100 text-yellow-700"><Edit3 className="w-4 h-4" /></div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{data.label || 'Rename Column'}</p>
        <p className="text-xs text-slate-500">Map a column to a new name</p>
      </div>
    </div>
    <div className="space-y-2 text-xs text-slate-700">
      {data.availableFields?.length ? (
        <select
          className="w-full rounded-md border border-slate-200 px-2 py-1"
          value={data.field || ''}
          onChange={(e) => data.setData?.((prev: RenameColumnNodeData) => ({ ...prev, field: e.target.value }))}
        >
          <option value="">Select column...</option>
          {data.availableFields.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      ) : (
        <input
          className="w-full rounded-md border border-slate-200 px-2 py-1"
          placeholder="Column name"
          value={data.field || ''}
          onChange={(e) => data.setData?.((prev: RenameColumnNodeData) => ({ ...prev, field: e.target.value }))}
        />
      )}
      <input
        className="w-full rounded-md border border-slate-200 px-2 py-1"
        placeholder="New name"
        value={data.newName}
        onChange={(e) => data.setData?.((prev: RenameColumnNodeData) => ({ ...prev, newName: e.target.value }))}
      />
    </div>
  </div>
)
