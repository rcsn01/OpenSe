import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Book } from 'lucide-react'
import { LookupNodeData } from './types'

const parseMap = (text: string) => {
  try {
    const obj = JSON.parse(text)
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj as Record<string, string>
  } catch (_) {
    return undefined
  }
  return undefined
}

export const LookupNode = ({ data }: NodeProps<LookupNodeData>) => {
  const mapText = JSON.stringify(data.map || {}, null, 0)

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-64">
      <Handle type="target" position={Position.Left} id="in" className="!bg-slate-400" />
      <Handle type="source" position={Position.Right} id="out" className="!bg-emerald-600" />
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-md bg-emerald-100 text-emerald-700"><Book className="w-4 h-4" /></div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{data.label || 'Lookup'}</p>
          <p className="text-xs text-slate-500">Map key to value</p>
        </div>
      </div>
      <div className="space-y-2 text-xs text-slate-700">
        {data.availableFields?.length ? (
          <select
            className="w-full rounded-md border border-slate-200 px-2 py-1"
            value={data.field || ''}
            onChange={(e) => data.setData?.((prev: LookupNodeData) => ({ ...prev, field: e.target.value }))}
          >
            <option value="">Select key column...</option>
            {data.availableFields.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        ) : (
          <input
            className="w-full rounded-md border border-slate-200 px-2 py-1"
            placeholder="Key column"
            value={data.field || ''}
            onChange={(e) => data.setData?.((prev: LookupNodeData) => ({ ...prev, field: e.target.value }))}
          />
        )}
        <input
          className="w-full rounded-md border border-slate-200 px-2 py-1"
          placeholder="New field name (optional)"
          value={data.newField || ''}
          onChange={(e) => data.setData?.((prev: LookupNodeData) => ({ ...prev, newField: e.target.value }))}
        />
        <textarea
          className="w-full rounded-md border border-slate-200 px-2 py-1 h-24"
          placeholder='Lookup map JSON, e.g. {"US":"United States"}'
          value={mapText}
          onChange={(e) => data.setData?.((prev: LookupNodeData) => ({ ...prev, map: parseMap(e.target.value) || prev.map || {} }))}
        />
      </div>
    </div>
  )
}
