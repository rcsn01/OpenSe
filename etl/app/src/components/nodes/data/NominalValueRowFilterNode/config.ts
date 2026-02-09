import { ListChecks } from 'lucide-react';
import { NominalValueRowFilterNode } from './index';
import { processNominalValueRowFilter } from './logic';
import { NodeConfig } from '../../registry.types';
import { NominalValueRowFilterNodeData } from '../../types';
import { NominalValueRowFilterNodeProperties } from './properties';

const config: NodeConfig<NominalValueRowFilterNodeData> = {
  type: 'nominalValueRowFilter',
  label: 'Value Row Filter',
  category: 'Data',
  icon: ListChecks,
  color: 'bg-teal-500',
  component: NominalValueRowFilterNode,
  propertiesComponent: NominalValueRowFilterNodeProperties,
  processor: processNominalValueRowFilter,
  initialData: {
    label: 'Value Row Filter',
    field: '',
    selectedValues: [],
    availableValues: [],
    availableFields: [],
    description: '',
  } as NominalValueRowFilterNodeData,
  inputs: ['in'],
  outputs: ['out'],
};

export default config;
export { config };
