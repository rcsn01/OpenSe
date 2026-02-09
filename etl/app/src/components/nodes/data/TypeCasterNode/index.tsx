import { NodeProps } from 'reactflow';
import { Type as TypeIcon } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { TypeCasterNodeData } from '../../types';

export const TypeCasterNode = ({ data, selected }: NodeProps<TypeCasterNodeData>) => {
  return (
    <BaseNode
      label={data.label || 'Type Caster'}
      description="Force column type"
      icon={TypeIcon}
      color="bg-fuchsia-500"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
    >
      {data.field ? (
        <p className="text-[11px] text-slate-600 truncate">
          <span className="font-semibold text-fuchsia-700">[{data.field}]</span>
          {' → '}
          <span className="text-fuchsia-500 uppercase text-[10px] font-bold">{data.targetType}</span>
        </p>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-1">No column selected</p>
      )}
    </BaseNode>
  );
};
