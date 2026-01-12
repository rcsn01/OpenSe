import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Dice3 } from 'lucide-react'
import { SamplerNodeData } from './types'

export const SamplerNode = ({ data }: NodeProps<SamplerNodeData>) => (
  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-64">
    <Handle type="target" position={Position.Left} id="in" className="!bg-slate-400" />
    <Handle type="source" position={Position.Right} id="out" className="!bg-slate-500" />
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-md bg-slate-100 text-slate-700"><Dice3 className="w-4 h-4" /></div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{data.label || 'Sampler / Limit'}</p>
        <p className="text-xs text-slate-500">Take top or random sample</p>
      </div>
    </div>
    <div className="space-y-2 text-xs text-slate-700">
      <select
        className="w-full rounded-md border border-slate-200 px-2 py-1"
        value={data.mode}
        onChange={(e) => data.setData?.((prev: SamplerNodeData) => ({ ...prev, mode: e.target.value as SamplerNodeData['mode'] }))}
      >
        <option value="top">Top N rows</option>
        <option value="random">Random sample (rows)</option>
      </select>
      <input
        type="number"
        min={1}
        className="w-full rounded-md border border-slate-200 px-2 py-1"
        value={data.amount}
        onChange={(e) => data.setData?.((prev: SamplerNodeData) => ({ ...prev, amount: Number(e.target.value) || 0 }))}
      />
    </div>
  </div>
)
