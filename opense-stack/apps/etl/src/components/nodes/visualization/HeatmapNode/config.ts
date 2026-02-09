import { Grid3X3 } from 'lucide-react';
import { HeatmapNode } from './index';
import { processHeatmap } from './logic';
import { NodeConfig } from '../../registry.types';
import { HeatmapNodeData } from '../../types';
import { HeatmapNodeProperties } from './properties';

const config: NodeConfig<HeatmapNodeData> = {
  type: 'heatmap',
  label: 'Heatmap',
  category: 'Visualization',
  icon: Grid3X3,
  color: 'bg-rose-600',
  component: HeatmapNode,
  propertiesComponent: HeatmapNodeProperties,
  processor: processHeatmap,
  initialData: {
    label: 'Heatmap',
    xAxis: '',
    yAxis: '',
    valueField: '',
    previewRows: [],
    availableFields: [],
    description: '',
  } as HeatmapNodeData,
  inputs: ['in'],
  outputs: ['out'],
  initialWidth: 450,
  initialHeight: 350,
};

export default config;
export { config };
