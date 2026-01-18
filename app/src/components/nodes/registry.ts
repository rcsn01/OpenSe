import {
  FileInput,
  Filter,
  Scissors,
  Copy,
  Search,
  Droplet,
  GitBranch,
  Dice3,
  Edit3,
  ArrowDownUp,
  Book,
  Type as TypeIcon,
  Save as SaveIcon,
  MousePointer2,
  Layers,
  Table,
  Info,
} from 'lucide-react';
import { FileInputNode } from './io/FileInputNode';
import { FilterNode } from './data/FilterNode';
import { FilterColumn } from './data/FilterColumn';
import { DeduplicateNode } from './data/DeduplicateNode';
import { FindReplaceNode } from './data/FindReplaceNode';
import { FillMissingNode } from './data/FillMissingNode';
import { ConditionalRouterNode } from './logic/ConditionalRouterNode';
import { SamplerNode } from './data/SamplerNode';
import { RenameColumnNode } from './data/RenameColumnNode';
import { SortNode } from './data/SortNode';
import { LookupNode } from './data/LookupNode';
import { TypeCasterNode } from './data/TypeCasterNode';
import { RenameNode } from './data/RenameNode';
import { UnpivotNode } from './data/UnpivotNode';
import { PivotNode } from './data/PivotNode';
import { SaveFileNode } from './output/SaveFileNode';
import { SplitNode } from './logic/SplitNode';
import { JoinNode } from './data/JoinNode';
import { JoinVerticalNode } from './data/JoinVerticalNode';
import { FilePreviewNode } from './output/FilePreviewNode';
import { NodeConfig, RegistryMap } from './registry.types';
import { processFileInput } from './io/FileInputNode/logic';
import { processFilter } from './data/FilterNode/logic';
import { processFilterColumns } from './data/FilterColumn/logic';
import { processDeduplicate } from './data/DeduplicateNode/logic';
import { processFindReplace } from './data/FindReplaceNode/logic';
import { processFillMissing } from './data/FillMissingNode/logic';
import { processRouter } from './logic/ConditionalRouterNode/logic';
import { processSampler } from './data/SamplerNode/logic';
import { processRenameColumn } from './data/RenameColumnNode/logic';
import { processSort } from './data/SortNode/logic';
import { processLookup } from './data/LookupNode/logic';
import { processTypeCast } from './data/TypeCasterNode/logic';
import { processRenameMap } from './data/RenameNode/logic';
import { processUnpivot } from './data/UnpivotNode/logic';
import { processPivot } from './data/PivotNode/logic';
import { processSave } from './output/SaveFileNode/logic';
import { processSplit } from './logic/SplitNode/logic';
import { processJoin } from './data/JoinNode/logic';
import { processJoinVertical } from './data/JoinVerticalNode/logic';
import { processPreview } from './output/FilePreviewNode/logic';
import {
  ConditionalRouterNodeData,
  DeduplicateNodeData,
  FileNodeData,
  FilterNodeData,
  BaseNodeData,
  LookupNodeData,
  PivotNodeData,
  PreviewNodeData,
  RemoveNodeData,
  RenameColumnNodeData,
  RenameNodeData,
  SamplerNodeData,
  SaveNodeData,
  SortNodeData,
  TypeCasterNodeData,
  UnpivotNodeData,
} from './types';

export const NODE_REGISTRY: RegistryMap = {
  file: {
    type: 'file',
    label: 'File Input',
    category: 'Input',
    icon: FileInput,
    color: 'bg-blue-500',
    component: FileInputNode,
    processor: processFileInput,
    initialData: { label: 'File Input', rows: [], description: '' } as FileNodeData,
    inputs: [],
    outputs: ['out'],
  },
  filter: {
    type: 'filter',
    label: 'Filter Rows',
    category: 'Data',
    icon: Filter,
    color: 'bg-indigo-500',
    component: FilterNode,
    processor: processFilter,
    initialData: { label: 'Filter Rows', field: '', operator: 'equals', value: '', description: '' } as FilterNodeData,
    inputs: ['in'],
    outputs: ['out'],
  },
  remove: {
    type: 'remove',
    label: 'Filter Columns',
    category: 'Data',
    icon: Scissors,
    color: 'bg-orange-500',
    component: FilterColumn,
    processor: processFilterColumns,
    initialData: { label: 'Filter Columns', field: '', selectedFields: [], availableFields: [], description: '' } as RemoveNodeData,
    inputs: ['in'],
    outputs: ['out'],
  },
  deduplicate: {
    type: 'deduplicate',
    label: 'Deduplicate',
    category: 'Data',
    icon: Copy,
    color: 'bg-amber-500',
    component: DeduplicateNode,
    processor: processDeduplicate,
    initialData: { label: 'Deduplicate', keys: [], availableFields: [], description: '' } as DeduplicateNodeData,
    inputs: ['in'],
    outputs: ['out'],
  },
  findReplace: {
    type: 'findReplace',
    label: 'Find & Replace',
    category: 'Data',
    icon: Search,
    color: 'bg-pink-500',
    component: FindReplaceNode,
    processor: processFindReplace,
    initialData: { label: 'Find & Replace', field: '', search: '', replace: '', availableFields: [], description: '' } as FindReplaceNodeData,
    inputs: ['in'],
    outputs: ['out'],
  },
  fillMissing: {
    type: 'fillMissing',
    label: 'Fill Missing',
    category: 'Data',
    icon: Droplet,
    color: 'bg-cyan-500',
    component: FillMissingNode,
    processor: processFillMissing,
    initialData: { label: 'Fill Missing', field: '', strategy: 'static', value: '', availableFields: [], description: '' } as FillMissingNodeData,
    inputs: ['in'],
    outputs: ['out'],
  },
  router: {
    type: 'router',
    label: 'Conditional Router',
    category: 'Logic',
    icon: GitBranch,
    color: 'bg-rose-500',
    component: ConditionalRouterNode,
    processor: processRouter,
    initialData: { label: 'Conditional Router', field: '', operator: 'equals', value: '', availableFields: [], description: '' } as ConditionalRouterNodeData,
    inputs: ['in'],
    outputs: ['out-yes', 'out-no'],
  },
  sampler: {
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
  },
  rename: {
    type: 'rename',
    label: 'Rename Column',
    category: 'Data',
    icon: Edit3,
    color: 'bg-yellow-500',
    component: RenameColumnNode,
    processor: processRenameColumn,
    initialData: { label: 'Rename Column', field: '', newName: '', availableFields: [], description: '' } as RenameColumnNodeData,
    inputs: ['in'],
    outputs: ['out'],
  },
  sort: {
    type: 'sort',
    label: 'Sort',
    category: 'Data',
    icon: ArrowDownUp,
    color: 'bg-indigo-600',
    component: SortNode,
    processor: processSort,
    initialData: { label: 'Sort', field: '', direction: 'asc', availableFields: [], description: '' } as SortNodeData,
    inputs: ['in'],
    outputs: ['out'],
  },
  lookup: {
    type: 'lookup',
    label: 'Lookup',
    category: 'Data',
    icon: Book,
    color: 'bg-emerald-600',
    component: LookupNode,
    processor: processLookup,
    initialData: { label: 'Lookup', field: '', newField: '', map: {}, availableFields: [], description: '' } as LookupNodeData,
    inputs: ['in'],
    outputs: ['out'],
  },
  typeCast: {
    type: 'typeCast',
    label: 'Type Caster',
    category: 'Data',
    icon: TypeIcon,
    color: 'bg-fuchsia-500',
    component: TypeCasterNode,
    processor: processTypeCast,
    initialData: { label: 'Type Caster', field: '', targetType: 'string', availableFields: [], description: '' } as TypeCasterNodeData,
    inputs: ['in'],
    outputs: ['out'],
  },
  renameMap: {
    type: 'renameMap',
    label: 'Rename (Mappings)',
    category: 'Data',
    icon: Edit3,
    color: 'bg-yellow-600',
    component: RenameNode,
    processor: processRenameMap,
    initialData: { label: 'Rename (Mappings)', mappings: [], availableFields: [], description: '' } as RenameNodeData,
    inputs: ['in'],
    outputs: ['out'],
  },
  unpivot: {
    type: 'unpivot',
    label: 'Unpivot (Melt)',
    category: 'Data',
    icon: GitBranch,
    color: 'bg-rose-600',
    component: UnpivotNode,
    processor: processUnpivot,
    initialData: { label: 'Unpivot (Melt)', keepColumns: [], pivotColumns: [], availableFields: [], description: '' } as UnpivotNodeData,
    inputs: ['in'],
    outputs: ['out'],
  },
  pivot: {
    type: 'pivot',
    label: 'Pivot',
    category: 'Data',
    icon: Table,
    color: 'bg-emerald-700',
    component: PivotNode,
    processor: processPivot,
    initialData: { label: 'Pivot', indexColumn: '', pivotColumn: '', valueColumn: '', availableFields: [], description: '' } as PivotNodeData,
    inputs: ['in'],
    outputs: ['out'],
  },
  save: {
    type: 'save',
    label: 'Save CSV',
    category: 'Output',
    icon: SaveIcon,
    color: 'bg-green-500',
    component: SaveFileNode,
    processor: processSave,
    initialData: { label: 'Save CSV' } as SaveNodeData,
    inputs: ['in'],
    outputs: [],
  },
  split: {
    type: 'split',
    label: 'Split Rows',
    category: 'Logic',
    icon: MousePointer2,
    color: 'bg-purple-500',
    component: SplitNode,
    processor: processSplit,
    initialData: { label: 'Split Rows' } as BaseNodeData,
    inputs: ['input'],
    outputs: ['output-even', 'output-odd'],
  },
  join: {
    type: 'join',
    label: 'Join Tables',
    category: 'Data',
    icon: MousePointer2,
    color: 'bg-emerald-500',
    component: JoinNode,
    processor: processJoin,
    initialData: { label: 'Join Tables' } as BaseNodeData,
    inputs: ['input-left', 'input-right'],
    outputs: ['output-merged'],
  },
  joinVertical: {
    type: 'joinVertical',
    label: 'Stack Tables',
    category: 'Data',
    icon: Layers,
    color: 'bg-emerald-700',
    component: JoinVerticalNode,
    processor: processJoinVertical,
    initialData: { label: 'Stack Tables' } as BaseNodeData,
    inputs: ['input-top', 'input-bottom'],
    outputs: ['output-stacked'],
  },
  preview: {
    type: 'preview',
    label: 'File Preview',
    category: 'Output',
    icon: Info,
    color: 'bg-teal-500',
    component: FilePreviewNode,
    processor: processPreview,
    initialData: { label: 'Preview', previewRows: [], description: '' } as PreviewNodeData,
    inputs: ['in'],
    outputs: ['out'],
  },
};

export const nodeTypes = Object.entries(NODE_REGISTRY).reduce((acc, [key, val]) => {
  acc[key] = val.component;
  return acc;
}, {} as Record<string, any>);

export const nodesByCategory = Object.values(NODE_REGISTRY).reduce((acc, node) => {
  if (!acc[node.category]) acc[node.category] = [] as NodeConfig[];
  acc[node.category].push(node);
  return acc;
}, {} as Record<string, NodeConfig[]>);
