import { Code2 } from 'lucide-react';
import { CodeNode } from './index';
import { processCode } from './logic';
import { NodeConfig } from '../../registry.types';
import { CodeNodeData } from '../../types';
import { CodeNodeProperties } from './properties';

const config: NodeConfig<CodeNodeData> = {
  type: 'code',
  label: 'Code',
  category: 'Logic',
  icon: Code2,
  color: 'bg-violet-500',
  component: CodeNode,
  propertiesComponent: CodeNodeProperties,
  processor: processCode,
  description: 'Run custom JavaScript on your data',
  initialData: {
    label: 'Code',
    language: 'javascript',
    code: `// Transform your data with JavaScript.\n// \`rows\` is the input array of objects.\n// Return the transformed array.\n\nreturn rows.map(row => ({\n  ...row,\n}));`,
    availableFields: [],
  } as CodeNodeData,
  inputs: ['in'],
  outputs: ['out'],
};

export default config;
export { config };
