import React from 'react';
import { NodeProps } from 'reactflow';
import { Dice3 } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { Select, NumberInput } from '../../_base/NodeControls';
import { SamplerNodeData } from '../../types';

export const SamplerNode = ({ data, selected }: NodeProps<SamplerNodeData>) => (
  <BaseNode
    label={data.label || 'Sampler / Limit'}
    description="Take top or random sample"
    icon={Dice3}
    color="bg-slate-500"
    inputs={['in']}
    outputs={['out']}
    selected={selected}
  >
    <Select
      value={data.mode}
      onChange={(e) => data.setData?.((prev: SamplerNodeData) => ({ ...prev, mode: e.target.value as SamplerNodeData['mode'] }))}
    >
      <option value="top">Top N rows</option>
      <option value="random">Random sample (rows)</option>
    </Select>
    <NumberInput
      min={1}
      value={data.amount}
      onChange={(e) => data.setData?.((prev: SamplerNodeData) => ({ ...prev, amount: Number(e.target.value) || 0 }))}
    />
  </BaseNode>
);
