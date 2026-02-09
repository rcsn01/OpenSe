import { BarChart2 } from 'lucide-react';
import { HistogramNode } from './index';
import { processHistogram } from './logic';
import { NodeConfig } from '../../registry.types';
import { HistogramNodeData } from '../../types';
import { HistogramNodeProperties } from './properties';

const config: NodeConfig<HistogramNodeData> = {
  type: 'histogram',
  label: 'Histogram',
  category: 'Visualization',
  icon: BarChart2,
  color: 'bg-amber-600',
  component: HistogramNode,
  propertiesComponent: HistogramNodeProperties,
  processor: processHistogram,
  initialData: {
    label: 'Histogram',
    field: '',
    bins: 10,
    previewRows: [],
    availableFields: [],
    description: '',
  } as HistogramNodeData,
  inputs: ['in'],
  outputs: ['out'],
  initialWidth: 400,
  initialHeight: 300,
};

export default config;
export { config };
