import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { GitBranch } from 'lucide-react'
import { ConditionalRouterNodeData } from './types'

export const ConditionalRouterNode = ({ data }: NodeProps<ConditionalRouterNodeData>) => (
  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-64">
    <Handle type="target" position={Position.Left} id="in" className="!bg-slate-400" />
    <Handle type="source" position={Position.Right} id="out-yes" className="!bg-rose-500" />
    <Handle type="source" position={Position.Right} id="out-no" className="!bg-slate-400 top-1/2" />
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-md bg-rose-100 text-rose-700"><GitBranch className="w-4 h-4" /></div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{data.label || 'Conditional Router'}</p>
        <p className="text-xs text-slate-500">Send rows to Yes/No</p>
      </div>
    </div>
    <div className="space-y-2 text-xs text-slate-700">
      {data.availableFields?.length ? (
        <select
          className="w-full rounded-md border border-slate-200 px-2 py-1"
          value={data.field || ''}
          onChange={(e) => data.setData?.((prev: ConditionalRouterNodeData) => ({ ...prev, field: e.target.value }))}
        >
          <option value="">Select column...</option>
          {data.availableFields.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      ) : (
        <input
          className="w-full rounded-md border border-slate-200 px-2 py-1"
          placeholder="Column name"
          value={data.field || ''}
          onChange={(e) => data.setData?.((prev: ConditionalRouterNodeData) => ({ ...prev, field: e.target.value }))}
        />
      )}
      <select
        className="w-full rounded-md border border-slate-200 px-2 py-1"
        value={data.operator}
        onChange={(e) => data.setData?.((prev: ConditionalRouterNodeData) => ({ ...prev, operator: e.target.value as ConditionalRouterNodeData['operator'] }))}
      >
        <option value="equals">equals</option>
        <option value="contains">contains</option>
      </select>
      <input
        className="w-full rounded-md border border-slate-200 px-2 py-1"
        placeholder="Value"
        value={data.value}
        onChange={(e) => data.setData?.((prev: ConditionalRouterNodeData) => ({ ...prev, value: e.target.value }))}
      />
    </div>
  </div>
)
