import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Type as TypeIcon } from 'lucide-react'
import { TypeCasterNodeData } from './types'

export const TypeCasterNode = ({ data }: NodeProps<TypeCasterNodeData>) => (
  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-64">
    <Handle type="target" position={Position.Left} id="in" className="!bg-slate-400" />
    <Handle type="source" position={Position.Right} id="out" className="!bg-fuchsia-500" />
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-md bg-fuchsia-100 text-fuchsia-700"><TypeIcon className="w-4 h-4" /></div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{data.label || 'Type Caster'}</p>
        <p className="text-xs text-slate-500">Force column type</p>
      </div>
    </div>
    <div className="space-y-2 text-xs text-slate-700">
      {data.availableFields?.length ? (
        <select
          className="w-full rounded-md border border-slate-200 px-2 py-1"
          value={data.field || ''}
          onChange={(e) => data.setData?.((prev: TypeCasterNodeData) => ({ ...prev, field: e.target.value }))}
        >
          <option value="">Select column...</option>
          {data.availableFields.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      ) : (
        <input
          className="w-full rounded-md border border-slate-200 px-2 py-1"
          placeholder="Column name"
          value={data.field || ''}
          onChange={(e) => data.setData?.((prev: TypeCasterNodeData) => ({ ...prev, field: e.target.value }))}
        />
      )}
      <select
        className="w-full rounded-md border border-slate-200 px-2 py-1"
        value={data.targetType}
        onChange={(e) => data.setData?.((prev: TypeCasterNodeData) => ({ ...prev, targetType: e.target.value as TypeCasterNodeData['targetType'] }))}
      >
        <option value="string">String</option>
        <option value="number">Number</option>
        <option value="boolean">Boolean</option>
        <option value="date">Date</option>
      </select>
    </div>
  </div>
)
