import { NodeProps } from 'reactflow';
import { Filter } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { FilterNodeData } from '../../types';

export const FilterNode = ({ data, selected }: NodeProps<FilterNodeData>) => {
  return (
    <BaseNode
      label={data.label || 'Filter Rows'}
      description="Keep rows matching"
      icon={Filter}
      color="bg-indigo-500"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
    >
      {data.field ? (
        <p className="text-[11px] text-slate-600 truncate">
          Where <span className="font-semibold text-indigo-700">[{data.field}]</span>{' '}
          <span className="text-indigo-500">{data.operator}</span>{' '}
          <span className="font-mono text-slate-700">"{data.value}"</span>
        </p>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-1">No filter configured</p>
      )}
    </BaseNode>
  );
};
