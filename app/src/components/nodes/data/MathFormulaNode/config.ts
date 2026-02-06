import { Calculator } from 'lucide-react';
import { MathFormulaNode } from './index';
import { processMathFormula } from './logic';
import { NodeConfig } from '../../registry.types';
import { MathFormulaNodeData } from '../../types';
import { MathFormulaNodeProperties } from './properties';

const config: NodeConfig<MathFormulaNodeData> = {
  type: 'mathFormula',
  label: 'Math Formula',
  category: 'Data',
  icon: Calculator,
  color: 'bg-orange-600',
  component: MathFormulaNode,
  propertiesComponent: MathFormulaNodeProperties,
  processor: processMathFormula,
  initialData: {
    label: 'Math Formula',
    expression: '',
    newColumn: '',
    availableFields: [],
    description: '',
  } as MathFormulaNodeData,
  inputs: ['in'],
  outputs: ['out'],
};

export default config;
export { config };
