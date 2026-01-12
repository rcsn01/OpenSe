import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Edit3, Plus, X } from 'lucide-react'
import { RenameNodeData } from './types'

export const RenameNode = ({ data }: NodeProps<RenameNodeData>) => {
  const mappings = data.mappings || []
  const available = data.availableFields || []

  const updateMapping = (idx: number, key: 'oldColumn' | 'newColumn', value: string) => {
    data.setData?.((prev: RenameNodeData) => {
      const next = [...(prev.mappings || [])]
      next[idx] = { ...next[idx], [key]: value }
      return { ...prev, mappings: next }
    })
  }

  const addMapping = () => {
    data.setData?.((prev: RenameNodeData) => ({ ...prev, mappings: [...(prev.mappings || []), { oldColumn: '', newColumn: '' }] }))
  }

  const removeMapping = (idx: number) => {
    data.setData?.((prev: RenameNodeData) => {
      const next = [...(prev.mappings || [])]
      next.splice(idx, 1)
      return { ...prev, mappings: next }
    })
  }

  const renderSelect = (value: string, onChange: (v: string) => void, placeholder: string) => (
    available.length ? (
      <select
        className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {available.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>
    ) : (
      <input
        className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  )

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-72">
      <Handle type="target" position={Position.Left} id="in" className="!bg-slate-400" />
      <Handle type="source" position={Position.Right} id="out" className="!bg-yellow-500" />
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-md bg-yellow-100 text-yellow-700"><Edit3 className="w-4 h-4" /></div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{data.label || 'Rename Columns'}</p>
          <p className="text-xs text-slate-500">Add rename pairs</p>
        </div>
      </div>

      <div className="space-y-2 text-xs text-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">{mappings.length} mapping(s)</span>
          <button type="button" className="flex items-center gap-1 text-blue-600 text-[11px]" onClick={addMapping}>
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        <div className="max-h-40 overflow-y-auto space-y-2 pr-1" onWheel={(e) => e.stopPropagation()}>
          {mappings.map((m, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex-1 space-y-1">
                {renderSelect(m.oldColumn, (v) => updateMapping(idx, 'oldColumn', v), 'Old name')}
                <input
                  className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                  placeholder="New name"
                  value={m.newColumn}
                  onChange={(e) => updateMapping(idx, 'newColumn', e.target.value)}
                />
              </div>
              <button type="button" className="p-1 text-slate-400 hover:text-slate-600" onClick={() => removeMapping(idx)}>
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {mappings.length === 0 && (
            <p className="text-[11px] text-slate-500">Add a mapping to begin.</p>
          )}
        </div>
      </div>
    </div>
  )
}
