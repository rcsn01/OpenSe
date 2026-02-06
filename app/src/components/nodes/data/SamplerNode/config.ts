import { Dice3 } from 'lucide-react';
import { SamplerNode } from './index';
import { processSampler } from './logic';
import { NodeConfig } from '../../registry.types';
import { SamplerNodeData } from '../../types';
import { SamplerNodeProperties } from './properties';

const config: NodeConfig<SamplerNodeData> = {
  type: 'sampler',
  label: 'Sampler / Limit',
  category: 'Data',
  icon: Dice3,
  color: 'bg-slate-500',
  component: SamplerNode,
  propertiesComponent: SamplerNodeProperties,
  processor: processSampler,
  initialData: { label: 'Sampler / Limit', mode: 'top', amount: 100, description: '' } as SamplerNodeData,
  inputs: ['in'],
  outputs: ['out'],
};

export default config;
export { config };
