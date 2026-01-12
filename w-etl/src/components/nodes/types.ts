export type Row = Record<string, any>;
export type DataPacket = { rows: Row[]; schema: string[] };

export type BaseNodeData = {
  label: string;
  description?: string;
  setData?: (updater: (prev: any) => any) => void;
};

export type FileNodeData = BaseNodeData & {
  rows: Row[];
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
  field: string;
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
  | SaveNodeData
  | PreviewNodeData;
