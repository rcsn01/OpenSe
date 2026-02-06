import { NodeProps } from 'reactflow';
import { ArrowDownUp } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { SortNodeData } from '../../types';

export const SortNode = ({ data, selected }: NodeProps<SortNodeData>) => {
  const dirLabel = data.direction === 'desc' ? 'DESC' : 'ASC';

  return (
    <BaseNode
      label={data.label || 'Sort'}
      description="Order rows by a column"
      icon={ArrowDownUp}
      color="bg-indigo-600"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
    >
      {data.field ? (
        <p className="text-[11px] text-slate-600 truncate">
          Sorting by <span className="font-semibold text-indigo-700">[{data.field}]</span>{' '}
          <span className="text-indigo-500">{dirLabel}</span>
        </p>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-1">No column selected</p>
      )}
    </BaseNode>
  );
};
