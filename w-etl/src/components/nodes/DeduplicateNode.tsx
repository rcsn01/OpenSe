import React, { useMemo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Copy } from 'lucide-react'
import { DeduplicateNodeData } from './types'

export const DeduplicateNode = ({ data }: NodeProps<DeduplicateNodeData>) => {
  const available = data.availableFields || []
  const selected = useMemo(() => data.keys || [], [data.keys])

  const toggle = (field: string) => {
    data.setData?.((prev: DeduplicateNodeData) => {
      const current = prev.keys || []
      const next = current.includes(field) ? current.filter((f) => f !== field) : [...current, field]
      return { ...prev, keys: next }
    })
  }

  const selectAll = () => {
    if (!available.length) return
    data.setData?.((prev: DeduplicateNodeData) => ({ ...prev, keys: [...available] }))
  }

  const deselectAll = () => {
    data.setData?.((prev: DeduplicateNodeData) => ({ ...prev, keys: [] }))
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-64">
      <Handle type="target" position={Position.Left} id="in" className="!bg-slate-400" />
      <Handle type="source" position={Position.Right} id="out" className="!bg-amber-500" />
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-md bg-amber-100 text-amber-700"><Copy className="w-4 h-4" /></div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{data.label || 'Deduplicate'}</p>
          <p className="text-xs text-slate-500">Select keys to keep unique</p>
        </div>
      </div>

      {available.length ? (
        <div className="space-y-2 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <button className="flex-1 rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50" onClick={selectAll}>Select all</button>
            <button className="flex-1 rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50" onClick={deselectAll}>De-select all</button>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
            {available.map((field) => (
              <label key={field} className="flex items-center gap-2">
                <input type="checkbox" checked={selected.includes(field)} onChange={() => toggle(field)} className="rounded border-slate-300" />
                <span className="truncate" title={field}>{field}</span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Connect a source to pick keys.</p>
      )}

      <div className="mt-2 text-[11px] text-slate-500">{selected.length ? `${selected.length} key(s)` : 'Using entire row'}</div>
    </div>
  )
}
