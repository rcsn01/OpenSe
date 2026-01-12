import { Edge, Node } from 'reactflow';
import { Row, WorkflowNodeData, FileNodeData, FilterNodeData, RemoveNodeData, PreviewNodeData, SaveNodeData } from '../../components/nodes/types';

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

export const runExecution = (
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
  workflowName: string
): ExecutionResult => {
  const incoming: Record<string, Edge[]> = {};
  edges.forEach((e) => {
    if (!incoming[e.target]) incoming[e.target] = [];
    incoming[e.target].push(e as Edge);
  });

  const dataOut: Record<string, Record<string, Row[]>> = {};
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
        .map((d) => ({ edge: d, rows: dataOut[d.source]?.[d.sourceHandle || 'default'] }))
        .filter((x) => x.rows);
      if (deps.length && inputs.length !== deps.length) continue;

      const setOutput = (handleId: string, rows: Row[]) => {
        if (!dataOut[id]) dataOut[id] = {};
        dataOut[id][handleId || 'default'] = rows;
      };

      if (node.type === 'file') {
        const d = node.data as FileNodeData;
        setOutput('out', d.rows || []);
      } else if (node.type === 'filter') {
        const d = node.data as FilterNodeData;
        const sourceRows = inputs.find((x) => x.edge.targetHandle === 'in')?.rows || inputs[0]?.rows || [];
        if (!d.field || d.value === undefined) {
          setOutput('out', sourceRows);
        } else {
          const filtered = sourceRows.filter((r) => {
            const val = (r[d.field] ?? '').toString();
            return d.operator === 'equals' ? val === d.value : val.toLowerCase().includes(d.value.toLowerCase());
          });
          setOutput('out', filtered);
        }
      } else if (node.type === 'remove') {
        const d = node.data as RemoveNodeData;
        const sourceRows = inputs.find((x) => x.edge.targetHandle === 'in')?.rows || inputs[0]?.rows || [];
        if (!d.field) {
          setOutput('out', sourceRows);
        } else {
          const pruned = sourceRows.map((r) => {
            const clone = { ...r };
            delete clone[d.field];
            return clone;
          });
          setOutput('out', pruned);
        }
      } else if (node.type === 'split') {
        const sourceRows = inputs.find((x) => x.edge.targetHandle === 'input')?.rows || inputs[0]?.rows || [];
        const evens = sourceRows.filter((_, i) => i % 2 === 0);
        const odds = sourceRows.filter((_, i) => i % 2 !== 0);
        setOutput('output-even', evens);
        setOutput('output-odd', odds);
      } else if (node.type === 'join') {
        const left = inputs.find((x) => x.edge.targetHandle === 'input-left')?.rows || [];
        const right = inputs.find((x) => x.edge.targetHandle === 'input-right')?.rows || [];
        const minLength = Math.min(left.length, right.length);
        const merged: Row[] = [];
        for (let i = 0; i < minLength; i++) {
          merged.push({ ...left[i], ...right[i] });
        }
        setOutput('output-merged', merged);
      } else if (node.type === 'preview') {
        const sourceRows = inputs.find((x) => x.edge.targetHandle === 'in')?.rows || inputs[0]?.rows || [];
        setOutput('out', sourceRows);
        updatedNodes = updatedNodes.map((n, idx) =>
          idx === nodeIndex ? { ...n, data: { ...(n.data as PreviewNodeData), previewRows: sourceRows.slice(0, 10) } } : n
        );
      } else if (node.type === 'save') {
        const sourceRows = inputs.find((x) => x.edge.targetHandle === 'in')?.rows || inputs[0]?.rows || [];
        const csv = toCsv(sourceRows);
        setOutput('out', sourceRows);
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
