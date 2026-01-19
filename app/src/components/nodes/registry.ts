import { NodeConfig, RegistryMap } from './registry.types';

const configModules = import.meta.glob('./**/*.config.ts', { eager: true }) as Record<string, Record<string, unknown>>;

const isNodeConfig = (value: unknown): value is NodeConfig =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  'component' in (value as Record<string, unknown>);

export const NODE_REGISTRY: RegistryMap = {};

for (const [modulePath, exports] of Object.entries(configModules)) {
  const config = Object.values(exports).find(isNodeConfig);
  if (!config) {
    console.warn(`Node config not found in ${modulePath}`);
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
