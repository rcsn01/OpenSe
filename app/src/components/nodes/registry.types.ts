import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Node } from 'reactflow';
import { Row, WorkflowNodeData } from './types';
import { DataRef, ExecutionDownload } from '../../lib/execution/utils';

export type NodeCategory = 'Input' | 'Data' | 'Logic' | 'Output';

export type ProcessorHelpers = {
  persistRows: (rows: Row[]) => Promise<DataRef>;
  loadRows: (ref: DataRef | undefined, fallback?: Row[]) => Promise<Row[]>;
  toCsv: (rows: Row[]) => string;
  workflowName: string;
};

export type ProcessorInput = {
  rows: Row[];
  ref?: DataRef;
};

export type ProcessorContext<TData = WorkflowNodeData> = {
  data: TData;
  inputs: Record<string, ProcessorInput>;
  node: Node<WorkflowNodeData>;
  helpers: ProcessorHelpers;
};

export type ProcessorResult = {
  outputs: Record<string, DataRef>;
  updatedData?: Partial<WorkflowNodeData>;
  downloads?: ExecutionDownload[];
};

export type NodeProcessor<TData = WorkflowNodeData> = (ctx: ProcessorContext<TData>) => Promise<ProcessorResult>;

export interface NodeConfig<TData = WorkflowNodeData> {
  type: string;
  label: string;
  category: NodeCategory;
  icon: LucideIcon;
  color: string;
  component: React.ComponentType<any>;
  processor: NodeProcessor<TData>;
  initialData: TData;
  description?: string;
  inputs?: string[];
  outputs?: string[];
  initialWidth?: number;
  initialHeight?: number;
}

export type RegistryMap = Record<string, NodeConfig>;
