export type Row = Record<string, any>;

export type BaseNodeData = {
  label: string;
  description?: string;
  setData?: (updater: (prev: any) => any) => void;
};

export type FileNodeData = BaseNodeData & {
  rows: Row[];
  fileName?: string;
};

export type FilterNodeData = BaseNodeData & {
  field: string;
  operator: 'equals' | 'contains';
  value: string;
};

export type RemoveNodeData = BaseNodeData & {
  field: string;
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
