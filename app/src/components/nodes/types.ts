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

export type RenameNodeData = BaseNodeData & {
  mappings: { oldColumn: string; newColumn: string }[];
  availableFields?: string[];
};

export type UnpivotNodeData = BaseNodeData & {
  keepColumns: string[];
  pivotColumns: string[];
  availableFields?: string[];
};

export type PivotNodeData = BaseNodeData & {
  indexColumn: string;
  pivotColumn: string;
  valueColumn: string;
  availableFields?: string[];
};

export type MultiPivotNodeData = BaseNodeData & {
  indexColumns: string[];
  pivotColumn: string;
  valueColumns: string[];
  availableFields?: string[];
};

export type JoinVerticalNodeData = BaseNodeData & {};

export type SaveNodeData = BaseNodeData & {
  lastSavedCsv?: string;
};

export type PreviewNodeData = BaseNodeData & {
  previewRows?: Row[];
};

export type ColumnResorterNodeData = BaseNodeData & {
  columnOrder: string[];
  availableFields?: string[];
};

export type ColumnSplitterNodeData = BaseNodeData & {
  selectedColumns: string[];
  availableFields?: string[];
};

export type NominalValueRowFilterNodeData = BaseNodeData & {
  field?: string;
  selectedValues: string[];
  availableValues?: string[];
  availableFields?: string[];
};

export type MathFormulaNodeData = BaseNodeData & {
  expression: string;
  newColumn: string;
  availableFields?: string[];
};

export type GroupByNodeData = BaseNodeData & {
  groupByColumns: string[];
  aggregations: { column: string; function: 'sum' | 'count' | 'avg' | 'min' | 'max' }[];
  availableFields?: string[];
};

export type ConcatenateNodeData = BaseNodeData & {};

export type ChartNodeData = BaseNodeData & {
  xAxis?: string;
  yAxis?: string;
  previewRows?: Row[];
  availableFields?: string[];
};

export type PieChartNodeData = BaseNodeData & {
  nameKey?: string;
  valueKey?: string;
  previewRows?: Row[];
  availableFields?: string[];
};

export type HistogramNodeData = BaseNodeData & {
  field?: string;
  bins: number;
  previewRows?: Row[];
  availableFields?: string[];
};

export type BoxPlotNodeData = BaseNodeData & {
  field?: string;
  groupBy?: string;
  previewRows?: Row[];
  availableFields?: string[];
};

export type HeatmapNodeData = BaseNodeData & {
  xAxis?: string;
  yAxis?: string;
  valueField?: string;
  previewRows?: Row[];
  availableFields?: string[];
};

export type WorkflowNodeData = BaseNodeData;
