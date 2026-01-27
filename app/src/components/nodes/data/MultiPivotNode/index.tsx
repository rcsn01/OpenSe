import { useMemo } from 'react';
import { NodeProps } from 'reactflow';
import { Table, Key, LayoutGrid } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { MultiPivotNodeData } from '../../types';

export const MultiPivotNode = ({ data, selected }: NodeProps<MultiPivotNodeData>) => {
  const indexCols = useMemo(() => data.indexColumns || [], [data.indexColumns]);
  const valueCols = useMemo(() => data.valueColumns || [], [data.valueColumns]);

  return (
    <BaseNode
      label={data.label || 'Multi-Pivot'}
      description={data.pivotColumn ? `Pivoting on ${data.pivotColumn}` : 'Configure pivot settings'}
      icon={Table}
      color="bg-emerald-800"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
      className="w-72"
    >
      <div className="space-y-3">
        {/* Pivot Column (Header) */}
        <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded border border-emerald-100">
          <span className="text-[10px] uppercase font-bold text-emerald-700 w-12 shrink-0">Pivot</span>
          <span className="text-xs font-medium text-slate-800 truncate" title={data.pivotColumn}>
            {data.pivotColumn || <span className="text-slate-400 italic">Select column...</span>}
          </span>
        </div>

        {/* Index Columns Summary */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500">
            <Key className="w-3 h-3" />
            <span>Index Columns ({indexCols.length})</span>
          </div>
          {indexCols.length > 0 ? (
            <div className="flex flex-wrap gap-1 pl-1">
              {indexCols.slice(0, 3).map(c => (
                <span key={c} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded truncate max-w-[80px]">{c}</span>
              ))}
              {indexCols.length > 3 && <span className="text-[10px] text-slate-400 self-center">+{indexCols.length - 3}</span>}
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 italic pl-4">None selected</p>
          )}
        </div>

        {/* Value Columns Summary */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500">
            <LayoutGrid className="w-3 h-3" />
            <span>Value Columns ({valueCols.length})</span>
          </div>
          {valueCols.length > 0 ? (
            <div className="flex flex-wrap gap-1 pl-1">
              {valueCols.slice(0, 3).map(c => (
                <span key={c} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded truncate max-w-[80px]">{c}</span>
              ))}
              {valueCols.length > 3 && <span className="text-[10px] text-slate-400 self-center">+{valueCols.length - 3}</span>}
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 italic pl-4">None selected</p>
          )}
        </div>
      </div>
    </BaseNode>
  );
};
