import { NodeProps } from 'reactflow';
import { Layers } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { ConcatenateNodeData } from '../../types';

export const ConcatenateNode = ({ data, selected }: NodeProps<ConcatenateNodeData>) => {
  return (
    <BaseNode
      label={data.label || 'Concatenate'}
      description="Merge two tables vertically"
      icon={Layers}
      color="bg-sky-600"
      inputs={[{ id: 'top', label: 'Top' }, { id: 'bottom', label: 'Bottom' }]}
      outputs={['out']}
      selected={selected}
    >
      <p className="text-[11px] text-slate-500 text-center">
        Union of Top + Bottom tables
      </p>
    </BaseNode>
  );
};
