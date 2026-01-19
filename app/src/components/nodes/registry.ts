import { NodeConfig, RegistryMap } from './registry.types';

// Support both "config.ts" and "*.config.ts" naming conventions
const configModules = {
  ...import.meta.glob('./**/config.ts', { eager: true }) as Record<string, Record<string, unknown>>,
  ...import.meta.glob('./**/*.config.ts', { eager: true }) as Record<string, Record<string, unknown>>,
};

// Debug discovery of node configs to ensure Vite glob finds everything
console.log('🔍 Scanning for node configs...');
console.log('Found files:', Object.keys(configModules));

if (Object.keys(configModules).length === 0) {
  console.error('❌ No config files found! Check naming (*.config.ts) and location under nodes/.');
}

const isNodeConfig = (value: unknown): value is NodeConfig =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  'component' in (value as Record<string, unknown>);

export const NODE_REGISTRY: RegistryMap = {};

for (const [modulePath, exports] of Object.entries(configModules)) {
  const config = Object.values(exports).find(isNodeConfig);
  if (!config) {
    console.warn(`⚠️ File found but config invalid: ${modulePath}`, exports);
    continue;
  }
  NODE_REGISTRY[config.type] = config;
}

export const nodeTypes = Object.entries(NODE_REGISTRY).reduce((acc, [key, val]) => {
  acc[key] = val.component;
  return acc;
}, {} as Record<string, any>);

export const nodesByCategory = Object.values(NODE_REGISTRY).reduce((acc, node) => {
  if (!acc[node.category]) acc[node.category] = [] as NodeConfig[];
  acc[node.category].push(node);
  return acc;
}, {} as Record<string, NodeConfig[]>);
