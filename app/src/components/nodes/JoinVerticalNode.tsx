import React from 'react'
import { Handle, Position } from 'reactflow'
import { Layers } from 'lucide-react'

export const JoinVerticalNode = () => (
  <div className="bg-white border border-emerald-200 rounded-lg p-4 shadow-md w-64">
    <div className="flex items-center gap-2 mb-3">
      <div className="p-2 rounded-md bg-emerald-100 text-emerald-700">
        <Layers className="w-4 h-4" />
      </div>
      <div>
        <div className="font-bold text-sm text-emerald-800">Stack Tables</div>
        <div className="text-xs text-slate-500">Append rows by column name</div>
      </div>
    </div>

    <div className="relative flex items-center mb-2">
      <Handle
        type="target"
        position={Position.Left}
        id="input-top"
        className="w-3 h-3 bg-blue-500 !left-[-18px]"
      />
      <span className="text-xs text-slate-500 ml-2">Top table</span>
    </div>

    <div className="relative flex items-center mb-4">
      <Handle
        type="target"
        position={Position.Left}
        id="input-bottom"
        className="w-3 h-3 bg-orange-500 !left-[-18px]"
      />
      <span className="text-xs text-slate-500 ml-2">Bottom table</span>
    </div>

    <Handle
      type="source"
      position={Position.Right}
      id="output-stacked"
      className="w-3 h-3 bg-emerald-600"
    />
    <div className="text-right text-xs text-slate-400 mt-2">
      Rows are appended; missing columns are left blank.
    </div>
  </div>
)
