import { NodeProps } from 'reactflow';
import { Table } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { PivotNodeData } from '../../types';

export const PivotNode = ({ data, selected }: NodeProps<PivotNodeData>) => {
  const configured = data.indexColumn && data.pivotColumn && data.valueColumn;

  return (
    <BaseNode
      label={data.label || 'Pivot'}
      description="Rows to columns"
      icon={Table}
      color="bg-emerald-700"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
    >
      {configured ? (
        <div className="space-y-0.5">
          <p className="text-[11px] text-slate-600 truncate">
            Index: <span className="font-semibold text-emerald-700">[{data.indexColumn}]</span>
          </p>
          <p className="text-[11px] text-slate-600 truncate">
            Pivot: <span className="font-semibold text-emerald-600">[{data.pivotColumn}]</span>
          </p>
          <p className="text-[11px] text-slate-600 truncate">
            Value: <span className="font-semibold text-emerald-500">[{data.valueColumn}]</span>
          </p>
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-1">Not fully configured</p>
      )}
    </BaseNode>
  );
};
