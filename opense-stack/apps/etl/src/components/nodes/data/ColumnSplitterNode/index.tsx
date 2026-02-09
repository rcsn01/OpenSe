import { NodeProps } from 'reactflow';
import { Columns } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { ColumnSplitterNodeData } from '../../types';

export const ColumnSplitterNode = ({ data, selected }: NodeProps<ColumnSplitterNodeData>) => {
  const sel = data.selectedColumns || [];
  const total = data.availableFields?.length || 0;
  const complement = total - sel.length;

  return (
    <BaseNode
      label={data.label || 'Column Splitter'}
      description="Split table by columns"
      icon={Columns}
      color="bg-amber-500"
      inputs={['in']}
      outputs={[{ id: 'top', label: 'Top' }, { id: 'bottom', label: 'Bottom' }]}
      selected={selected}
    >
      {sel.length > 0 ? (
        <div className="space-y-0.5">
          <p className="text-[11px] text-slate-600">
            Top: <span className="font-semibold text-amber-700">{sel.length}</span> columns
          </p>
          <p className="text-[11px] text-slate-600">
            Bottom: <span className="font-semibold text-amber-600">{complement >= 0 ? complement : '?'}</span> columns
          </p>
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-1">No columns selected</p>
      )}
    </BaseNode>
  );
};
