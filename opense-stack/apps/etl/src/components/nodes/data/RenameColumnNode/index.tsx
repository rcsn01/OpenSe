import { NodeProps } from 'reactflow';
import { Edit3 } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { RenameColumnNodeData } from '../../types';

export const RenameColumnNode = ({ data, selected }: NodeProps<RenameColumnNodeData>) => {
  return (
    <BaseNode
      label={data.label || 'Rename Column'}
      description="Map a column to a new name"
      icon={Edit3}
      color="bg-yellow-500"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
    >
      {data.field && data.newName ? (
        <p className="text-[11px] text-slate-600 truncate">
          <span className="font-semibold text-yellow-700">[{data.field}]</span>
          {' → '}
          <span className="font-semibold text-yellow-600">[{data.newName}]</span>
        </p>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-1">No rename configured</p>
      )}
    </BaseNode>
  );
};
