import { NodeProps } from 'reactflow';
import { Dice3 } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { SamplerNodeData } from '../../types';

export const SamplerNode = ({ data, selected }: NodeProps<SamplerNodeData>) => {
  const modeLabel = data.mode === 'random' ? 'Random' : 'Top';

  return (
    <BaseNode
      label={data.label || 'Sampler / Limit'}
      description="Take top or random sample"
      icon={Dice3}
      color="bg-slate-500"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
    >
      <p className="text-[11px] text-slate-600 text-center">
        <span className="font-semibold text-slate-700">{modeLabel}</span>{' '}
        <span className="text-slate-500">{data.amount} rows</span>
      </p>
    </BaseNode>
  );
};
