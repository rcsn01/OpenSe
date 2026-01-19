import { Dice3 } from 'lucide-react';
import { SamplerNode } from './index';
import { processSampler } from './logic';
import { NodeConfig } from '../../registry.types';
import { SamplerNodeData } from '../../types';

const config: NodeConfig = {
  type: 'sampler',
  label: 'Sampler / Limit',
  category: 'Data',
  icon: Dice3,
  color: 'bg-slate-500',
  component: SamplerNode,
  processor: processSampler,
  initialData: { label: 'Sampler / Limit', mode: 'top', amount: 100, description: '' } as SamplerNodeData,
  inputs: ['in'],
  outputs: ['out'],
};

export default config;
export { config };
