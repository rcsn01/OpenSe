export type Row = Record<string, any>;
export type DataPacket = { rows: Row[]; schema: string[] };

export type BaseNodeData = {
  label: string;
  description?: string;
  setData?: (updater: (prev: any) => any) => void;
};

export type FileNodeData = BaseNodeData & {
  rows?: Row[]; // optional small preview only
  datasetId?: string;
  count?: number;
  chunkCount?: number;
  fileName?: string;
  schema?: string[];
};

export type FilterNodeData = BaseNodeData & {
  field: string;
  operator: 'equals' | 'contains';
  value: string;
  availableFields?: string[];
};

export type RemoveNodeData = BaseNodeData & {
  field?: string;
  selectedFields?: string[];
  availableFields?: string[];
};

export type DeduplicateNodeData = BaseNodeData & {
  keys?: string[];
  availableFields?: string[];
};

export type FindReplaceNodeData = BaseNodeData & {
  field?: string;
  search: string;
  replace: string;
  caseSensitive?: boolean;
  availableFields?: string[];
};

export type FillMissingNodeData = BaseNodeData & {
  field?: string;
  strategy: 'static' | 'mean' | 'median' | 'ffill';
  value?: string;
  availableFields?: string[];
};

export type ConditionalRouterNodeData = BaseNodeData & {
  field?: string;
  operator: 'equals' | 'contains';
  value: string;
  availableFields?: string[];
};

export type SamplerNodeData = BaseNodeData & {
  mode: 'top' | 'random';
  amount: number;
};

export type RenameColumnNodeData = BaseNodeData & {
  field?: string;
  newName: string;
  availableFields?: string[];
};

export type SortNodeData = BaseNodeData & {
  field?: string;
  direction: 'asc' | 'desc';
  availableFields?: string[];
};

export type LookupNodeData = BaseNodeData & {
  field?: string;
  newField?: string;
  map: Record<string, string>;
  availableFields?: string[];
};

export type TypeCasterNodeData = BaseNodeData & {
  field?: string;
  targetType: 'string' | 'number' | 'boolean' | 'date';
  availableFields?: string[];
};

export type SaveNodeData = BaseNodeData & {
  lastSavedCsv?: string;
};

export type PreviewNodeData = BaseNodeData & {
  previewRows?: Row[];
};

export type WorkflowNodeData =
  | FileNodeData
  | FilterNodeData
  | RemoveNodeData
  | DeduplicateNodeData
  | FindReplaceNodeData
  | FillMissingNodeData
  | ConditionalRouterNodeData
  | SamplerNodeData
  | RenameColumnNodeData
  | SortNodeData
  | LookupNodeData
  | TypeCasterNodeData
  | SaveNodeData
  | PreviewNodeData;
