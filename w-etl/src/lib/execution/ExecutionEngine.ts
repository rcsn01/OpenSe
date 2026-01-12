import { Edge, Node } from 'reactflow';
import { Row, WorkflowNodeData, FileNodeData, FilterNodeData, RemoveNodeData, PreviewNodeData, SaveNodeData } from '../../components/nodes/types';
import { db } from '../db';

export type ExecutionDownload = { csv: string; filename: string };

export type ExecutionResult = {
  updatedNodes: Node<WorkflowNodeData>[];
  downloads: ExecutionDownload[];
  unresolved: string[];
};

const toCsv = (rows: Row[]) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  rows.forEach((r) => {
    lines.push(headers.map((h) => JSON.stringify(r[h] ?? '')).join(','));
  });
  return lines.join('\n');
};

type DataRef = {
  datasetId?: string;
  schema?: string[];
  preview?: Row[];
  count?: number;
};

const loadRows = async (ref: DataRef | undefined, fallbackRows: Row[] = []) => {
  if (!ref) return fallbackRows;
  if (ref.datasetId) {
    const found = await db.datasets.get(ref.datasetId);
    return found?.rows || [];
  }
  return fallbackRows;
};

const persistRows = async (rows: Row[]): Promise<DataRef> => {
  const datasetId = crypto.randomUUID();
  await db.datasets.put({ id: datasetId, rows, timestamp: Date.now() });
  return {
    datasetId,
    schema: rows.length ? Object.keys(rows[0]) : [],
    count: rows.length,
    preview: rows.slice(0, 10),
  };
};

export const runExecution = async (
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
  workflowName: string
): Promise<ExecutionResult> => {
  const incoming: Record<string, Edge[]> = {};
  edges.forEach((e) => {
    if (!incoming[e.target]) incoming[e.target] = [];
    incoming[e.target].push(e as Edge);
  });

  const dataOut: Record<string, Record<string, DataRef>> = {};
  const unresolved = new Set(nodes.map((n) => n.id));
  let progress = true;
  const downloads: ExecutionDownload[] = [];
  let updatedNodes = nodes.map((n) => ({ ...n }));

  while (unresolved.size && progress) {
    progress = false;
    for (const id of Array.from(unresolved)) {
      const nodeIndex = updatedNodes.findIndex((n) => n.id === id);
      if (nodeIndex === -1) continue;
      const node = updatedNodes[nodeIndex];

      const deps = incoming[id] || [];
      const inputs = deps
        .map((d) => ({ edge: d, ref: dataOut[d.source]?.[d.sourceHandle || 'default'] }))
        .filter((x) => x.ref);
      if (deps.length && inputs.length !== deps.length) continue;

      const setOutput = (handleId: string, ref: DataRef) => {
        if (!dataOut[id]) dataOut[id] = {};
        dataOut[id][handleId || 'default'] = ref;
      };

      if (node.type === 'file') {
        const d = node.data as FileNodeData;
        let ref: DataRef | undefined = {
          datasetId: d.datasetId,
          schema: d.schema,
          preview: d.rows,
          count: d.count,
        };

        if (!ref.datasetId && d.rows && d.rows.length) {
          ref = await persistRows(d.rows);
          updatedNodes = updatedNodes.map((n, idx) =>
            idx === nodeIndex ? { ...n, data: { ...d, datasetId: ref?.datasetId, schema: ref?.schema, count: ref?.count, rows: ref?.preview } } : n
          );
        }

        setOutput('out', ref || {});
      } else if (node.type === 'filter') {
        const d = node.data as FilterNodeData;
        const sourceRef = inputs.find((x) => x.edge.targetHandle === 'in')?.ref || inputs[0]?.ref;
        const sourceRows = await loadRows(sourceRef);
        const filtered = !d.field || d.value === undefined
          ? sourceRows
          : sourceRows.filter((r) => {
              const val = (r[d.field] ?? '').toString();
              return d.operator === 'equals' ? val === d.value : val.toLowerCase().includes(d.value.toLowerCase());
            });
        const outRef = await persistRows(filtered);
        setOutput('out', outRef);
      } else if (node.type === 'remove') {
        const d = node.data as RemoveNodeData;
        const sourceRef = inputs.find((x) => x.edge.targetHandle === 'in')?.ref || inputs[0]?.ref;
        const sourceRows = await loadRows(sourceRef);
        const pruned = !d.field
          ? sourceRows
          : sourceRows.map((r) => {
              const clone = { ...r };
              delete clone[d.field];
              return clone;
            });
        const outRef = await persistRows(pruned);
        setOutput('out', outRef);
      } else if (node.type === 'split') {
        const sourceRef = inputs.find((x) => x.edge.targetHandle === 'input')?.ref || inputs[0]?.ref;
        const sourceRows = await loadRows(sourceRef);
        const evens = sourceRows.filter((_, i) => i % 2 === 0);
        const odds = sourceRows.filter((_, i) => i % 2 !== 0);
        setOutput('output-even', await persistRows(evens));
        setOutput('output-odd', await persistRows(odds));
      } else if (node.type === 'join') {
        const leftRef = inputs.find((x) => x.edge.targetHandle === 'input-left')?.ref;
        const rightRef = inputs.find((x) => x.edge.targetHandle === 'input-right')?.ref;
        const left = await loadRows(leftRef);
        const right = await loadRows(rightRef);
        const minLength = Math.min(left.length, right.length);
        const merged: Row[] = [];
        for (let i = 0; i < minLength; i++) {
          merged.push({ ...left[i], ...right[i] });
        }
        setOutput('output-merged', await persistRows(merged));
      } else if (node.type === 'preview') {
        const sourceRef = inputs.find((x) => x.edge.targetHandle === 'in')?.ref || inputs[0]?.ref;
        const sourceRows = await loadRows(sourceRef);
        setOutput('out', sourceRef || {});
        updatedNodes = updatedNodes.map((n, idx) =>
          idx === nodeIndex
            ? { ...n, data: { ...(n.data as PreviewNodeData), previewRows: sourceRows.slice(0, 10) } }
            : n
        );
      } else if (node.type === 'save') {
        const sourceRef = inputs.find((x) => x.edge.targetHandle === 'in')?.ref || inputs[0]?.ref;
        const sourceRows = await loadRows(sourceRef);
        const csv = toCsv(sourceRows);
        setOutput('out', sourceRef || {});
        updatedNodes = updatedNodes.map((n, idx) =>
          idx === nodeIndex ? { ...n, data: { ...(n.data as SaveNodeData), lastSavedCsv: csv } } : n
        );
        downloads.push({ csv, filename: `${workflowName || 'workflow'}.csv` });
      }

      unresolved.delete(id);
      progress = true;
    }
  }

  return {
    updatedNodes,
    downloads,
    unresolved: Array.from(unresolved),
  };
};
