import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Search } from 'lucide-react'
import { FindReplaceNodeData } from './types'

export const FindReplaceNode = ({ data }: NodeProps<FindReplaceNodeData>) => (
  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-64">
    <Handle type="target" position={Position.Left} id="in" className="!bg-slate-400" />
    <Handle type="source" position={Position.Right} id="out" className="!bg-pink-500" />
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-md bg-pink-100 text-pink-700"><Search className="w-4 h-4" /></div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{data.label || 'Find & Replace'}</p>
        <p className="text-xs text-slate-500">Replace text in a column</p>
      </div>
    </div>
    <div className="space-y-2 text-xs text-slate-700">
      {data.availableFields?.length ? (
        <select
          className="w-full rounded-md border border-slate-200 px-2 py-1"
          value={data.field || ''}
          onChange={(e) => data.setData?.((prev: FindReplaceNodeData) => ({ ...prev, field: e.target.value }))}
        >
          <option value="">Select column...</option>
          {data.availableFields.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      ) : (
        <input
          className="w-full rounded-md border border-slate-200 px-2 py-1"
          placeholder="Column name"
          value={data.field || ''}
          onChange={(e) => data.setData?.((prev: FindReplaceNodeData) => ({ ...prev, field: e.target.value }))}
        />
      )}
      <input
        className="w-full rounded-md border border-slate-200 px-2 py-1"
        placeholder="Find"
        value={data.search}
        onChange={(e) => data.setData?.((prev: FindReplaceNodeData) => ({ ...prev, search: e.target.value }))}
      />
      <input
        className="w-full rounded-md border border-slate-200 px-2 py-1"
        placeholder="Replace"
        value={data.replace}
        onChange={(e) => data.setData?.((prev: FindReplaceNodeData) => ({ ...prev, replace: e.target.value }))}
      />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!!data.caseSensitive}
          onChange={(e) => data.setData?.((prev: FindReplaceNodeData) => ({ ...prev, caseSensitive: e.target.checked }))}
          className="rounded border-slate-300"
        />
        <span>Case sensitive</span>
      </label>
    </div>
  </div>
)
