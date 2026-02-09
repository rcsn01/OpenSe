import { useMemo } from 'react';
import { NodeProps } from 'reactflow';
import { GitBranch } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { UnpivotNodeData } from '../../types';

export const UnpivotNode = ({ data, selected }: NodeProps<UnpivotNodeData>) => {
  const keep = useMemo(() => data.keepColumns || [], [data.keepColumns]);
  const melt = useMemo(() => data.pivotColumns || [], [data.pivotColumns]);

  return (
    <BaseNode
      label={data.label || 'Unpivot (Melt)'}
      description="Columns to rows"
      icon={GitBranch}
      color="bg-rose-500"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
    >
      {keep.length > 0 || melt.length > 0 ? (
        <div className="space-y-0.5">
          <p className="text-[11px] text-slate-600">
            Keep: <span className="font-semibold text-rose-700">{keep.length}</span> col{keep.length !== 1 ? 's' : ''}
          </p>
          <p className="text-[11px] text-slate-600">
            Melt: <span className="font-semibold text-rose-600">{melt.length}</span> col{melt.length !== 1 ? 's' : ''}
          </p>
          <p className="text-[10px] text-slate-400">Output: Variable, Value</p>
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-1">No columns configured</p>
      )}
    </BaseNode>
  );
};
