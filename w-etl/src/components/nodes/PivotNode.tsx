import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Table } from 'lucide-react'
import { PivotNodeData } from './types'

const FieldSelect = ({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options?: string[]
  placeholder: string
}) => options?.length ? (
  <select
    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
    value={value}
    onChange={(e) => onChange(e.target.value)}
  >
    <option value="">{placeholder}</option>
    {options.map((f) => <option key={f} value={f}>{f}</option>)}
  </select>
) : (
  <input
    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
    placeholder={placeholder}
    value={value}
    onChange={(e) => onChange(e.target.value)}
  />
)

export const PivotNode = ({ data }: NodeProps<PivotNodeData>) => (
  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-64">
    <Handle type="target" position={Position.Left} id="in" className="!bg-slate-400" />
    <Handle type="source" position={Position.Right} id="out" className="!bg-emerald-700" />
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-md bg-emerald-100 text-emerald-700"><Table className="w-4 h-4" /></div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{data.label || 'Pivot'}</p>
        <p className="text-xs text-slate-500">Rows to columns</p>
      </div>
    </div>
    <div className="space-y-2 text-xs text-slate-700">
      <FieldSelect
        value={data.indexColumn}
        onChange={(v) => data.setData?.((prev: PivotNodeData) => ({ ...prev, indexColumn: v }))}
        options={data.availableFields}
        placeholder="Index column"
      />
      <FieldSelect
        value={data.pivotColumn}
        onChange={(v) => data.setData?.((prev: PivotNodeData) => ({ ...prev, pivotColumn: v }))}
        options={data.availableFields}
        placeholder="Column to pivot"
      />
      <FieldSelect
        value={data.valueColumn}
        onChange={(v) => data.setData?.((prev: PivotNodeData) => ({ ...prev, valueColumn: v }))}
        options={data.availableFields}
        placeholder="Value column"
      />
    </div>
  </div>
)
