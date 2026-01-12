import React, { useMemo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { GitBranch } from 'lucide-react'
import { UnpivotNodeData } from './types'

export const UnpivotNode = ({ data }: NodeProps<UnpivotNodeData>) => {
  const available = data.availableFields || []
  const keep = useMemo(() => data.keepColumns || [], [data.keepColumns])
  const melt = useMemo(() => data.pivotColumns || [], [data.pivotColumns])

  const toggle = (field: string, target: 'keep' | 'pivot') => {
    data.setData?.((prev: UnpivotNodeData) => {
      const current = target === 'keep' ? (prev.keepColumns || []) : (prev.pivotColumns || [])
      const next = current.includes(field) ? current.filter((f) => f !== field) : [...current, field]
      return target === 'keep'
        ? { ...prev, keepColumns: next }
        : { ...prev, pivotColumns: next }
    })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-72">
      <Handle type="target" position={Position.Left} id="in" className="!bg-slate-400" />
      <Handle type="source" position={Position.Right} id="out" className="!bg-rose-500" />
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-md bg-rose-100 text-rose-700"><GitBranch className="w-4 h-4" /></div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{data.label || 'Unpivot (Melt)'}</p>
          <p className="text-xs text-slate-500">Select keep + melt columns</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Keep</span><span>{keep.length}</span>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1 pr-1" onWheel={(e) => e.stopPropagation()}>
            {available.map((field) => (
              <label key={field} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={keep.includes(field)}
                  onChange={() => toggle(field, 'keep')}
                  className="rounded border-slate-300"
                />
                <span className="truncate" title={field}>{field}</span>
              </label>
            ))}
            {!available.length && <p className="text-[11px] text-slate-500">Connect data to select.</p>}
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Melt</span><span>{melt.length}</span>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1 pr-1" onWheel={(e) => e.stopPropagation()}>
            {available.map((field) => (
              <label key={field} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={melt.includes(field)}
                  onChange={() => toggle(field, 'pivot')}
                  className="rounded border-slate-300"
                />
                <span className="truncate" title={field}>{field}</span>
              </label>
            ))}
            {!available.length && <p className="text-[11px] text-slate-500">Connect data to select.</p>}
          </div>
        </div>
      </div>

      <div className="mt-2 text-[11px] text-slate-500">Output columns: Variable, Value</div>
    </div>
  )
}
