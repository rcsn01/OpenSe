import { Edge, Node } from 'reactflow';
import { Row, WorkflowNodeData, FileNodeData, FilterNodeData, RemoveNodeData, PreviewNodeData, SaveNodeData, DeduplicateNodeData, FindReplaceNodeData, FillMissingNodeData, ConditionalRouterNodeData, SamplerNodeData, RenameColumnNodeData, SortNodeData, LookupNodeData, TypeCasterNodeData, RenameNodeData, UnpivotNodeData, PivotNodeData, JoinVerticalNodeData } from '../../components/nodes/types';
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
    const meta = await db.datasets.get(ref.datasetId);
    if (!meta) return fallbackRows;
    const chunks = await db.datasetChunks.where('datasetId').equals(ref.datasetId).sortBy('index');
    const rows: Row[] = [];
    chunks.forEach((c) => rows.push(...c.rows));
    return rows;
  }
  return fallbackRows;
};

const persistRows = async (rows: Row[]): Promise<DataRef> => {
  const datasetId = crypto.randomUUID();
  const batchSize = 1000;
  let chunkIndex = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const slice = rows.slice(i, i + batchSize);
    await db.datasetChunks.add({ datasetId, index: chunkIndex++, rows: slice });
  }
  const schema = rows.length ? Object.keys(rows[0]) : [];
  await db.datasets.put({ id: datasetId, schema, count: rows.length, chunkCount: chunkIndex, timestamp: Date.now() });
  return {
    datasetId,
    schema,
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
        const targets = d.selectedFields?.length ? d.selectedFields : d.field ? [d.field] : [];
        const projected = !targets.length
          ? sourceRows
          : sourceRows.map((r) => {
              const kept: Row = {};
              targets.forEach((col) => {
                kept[col] = r[col];
              });
              return kept;
            });
        const outRef = await persistRows(projected);
        setOutput('out', outRef);
      } else if (node.type === 'deduplicate') {
        const d = node.data as DeduplicateNodeData;
        const sourceRef = inputs.find((x) => x.edge.targetHandle === 'in')?.ref || inputs[0]?.ref;
        const sourceRows = await loadRows(sourceRef);
        const keys = d.keys && d.keys.length ? d.keys : undefined;
        const seen = new Set<string>();
        const out: Row[] = [];
        for (const r of sourceRows) {
          const key = keys ? JSON.stringify(keys.map((k) => r[k])) : JSON.stringify(r);
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(r);
        }
        const outRef = await persistRows(out);
        setOutput('out', outRef);
      } else if (node.type === 'findReplace') {
        const d = node.data as FindReplaceNodeData;
        const sourceRef = inputs.find((x) => x.edge.targetHandle === 'in')?.ref || inputs[0]?.ref;
        const sourceRows = await loadRows(sourceRef);
        const out = sourceRows.map((r) => {
          if (!d.field || !(d.field in r)) return r;
          const val = r[d.field];
          if (val === null || val === undefined) return r;
          const str = val.toString();
          const needle = d.search || '';
          if (!needle) return r;
          const replaced = d.caseSensitive
            ? str.split(needle).join(d.replace)
            : str.replace(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), d.replace);
          return { ...r, [d.field]: replaced };
        });
        const outRef = await persistRows(out);
        setOutput('out', outRef);
      } else if (node.type === 'fillMissing') {
        const d = node.data as FillMissingNodeData;
        const sourceRef = inputs.find((x) => x.edge.targetHandle === 'in')?.ref || inputs[0]?.ref;
        const sourceRows = await loadRows(sourceRef);
        if (!d.field) {
          setOutput('out', sourceRef || {});
        } else {
          let fillVal: any = d.value;
          if (d.strategy === 'mean' || d.strategy === 'median') {
            const nums = sourceRows.map((r) => Number(r[d.field as string])).filter((n) => !Number.isNaN(n));
            if (nums.length) {
              nums.sort((a, b) => a - b);
              fillVal = d.strategy === 'mean'
                ? nums.reduce((a, b) => a + b, 0) / nums.length
                : nums[Math.floor(nums.length / 2)];
            }
          }
          const out = sourceRows.map((r, idx) => {
            const val = r[d.field as string];
            if (val === null || val === undefined || val === '') {
              if (d.strategy === 'ffill' && idx > 0) {
                return { ...r, [d.field as string]: out[idx - 1]?.[d.field as string] ?? fillVal };
              }
              return { ...r, [d.field as string]: fillVal };
            }
            return r;
          });
          const outRef = await persistRows(out);
          setOutput('out', outRef);
        }
      } else if (node.type === 'router') {
        const d = node.data as ConditionalRouterNodeData;
        const sourceRef = inputs.find((x) => x.edge.targetHandle === 'in')?.ref || inputs[0]?.ref;
        const sourceRows = await loadRows(sourceRef);
        const yes: Row[] = [];
        const no: Row[] = [];
        sourceRows.forEach((r) => {
          const val = (d.field ? r[d.field] : undefined)?.toString() ?? '';
          const match = d.operator === 'equals'
            ? val === d.value
            : val.toLowerCase().includes((d.value || '').toLowerCase());
          (match ? yes : no).push(r);
        });
        setOutput('out-yes', await persistRows(yes));
        setOutput('out-no', await persistRows(no));
      } else if (node.type === 'sampler') {
        const d = node.data as SamplerNodeData;
        const sourceRef = inputs.find((x) => x.edge.targetHandle === 'in')?.ref || inputs[0]?.ref;
        const sourceRows = await loadRows(sourceRef);
        let out: Row[] = [];
        const amt = Math.max(0, Math.min(sourceRows.length, Math.floor(d.amount)));
        if (d.mode === 'top') {
          out = sourceRows.slice(0, amt);
        } else {
          const shuffled = [...sourceRows];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          out = shuffled.slice(0, amt);
        }
        setOutput('out', await persistRows(out));
      } else if (node.type === 'rename') {
        const d = node.data as RenameColumnNodeData;
        const sourceRef = inputs.find((x) => x.edge.targetHandle === 'in')?.ref || inputs[0]?.ref;
        const sourceRows = await loadRows(sourceRef);
        if (!d.field || !d.newName) {
          setOutput('out', sourceRef || {});
        } else {
          const out = sourceRows.map((r) => {
            if (!(d.field as string in r)) return r;
            const { [d.field as string]: val, ...rest } = r;
            return { ...rest, [d.newName]: val };
          });
          setOutput('out', await persistRows(out));
        }
      } else if (node.type === 'renameMap') {
        const d = node.data as RenameNodeData;
        const sourceRef = inputs.find((x) => x.edge.targetHandle === 'in')?.ref || inputs[0]?.ref;
        const sourceRows = await loadRows(sourceRef);
        const mappings = d.mappings || [];
        if (!mappings.length) {
          setOutput('out', sourceRef || {});
        } else {
          const mapObj: Record<string, string> = {};
          mappings.forEach((m) => {
            if (m.oldColumn && m.newColumn) mapObj[m.oldColumn] = m.newColumn;
          });
          const out = sourceRows.map((r) => {
            const next: Row = {};
            Object.entries(r).forEach(([k, v]) => {
              const target = mapObj[k] || k;
              next[target] = v;
            });
            return next;
          });
          setOutput('out', await persistRows(out));
        }
      } else if (node.type === 'unpivot') {
        const d = node.data as UnpivotNodeData;
        const sourceRef = inputs.find((x) => x.edge.targetHandle === 'in')?.ref || inputs[0]?.ref;
        const sourceRows = await loadRows(sourceRef);
        const keeps = d.keepColumns || [];
        const melts = d.pivotColumns || [];
        if (!melts.length) {
          setOutput('out', sourceRef || {});
        } else {
          const out: Row[] = [];
          sourceRows.forEach((r) => {
            melts.forEach((col) => {
              const base: Row = {};
              keeps.forEach((k) => { base[k] = r[k]; });
              base.Variable = col;
              base.Value = r[col];
              out.push(base);
            });
          });
          setOutput('out', await persistRows(out));
        }
      } else if (node.type === 'pivot') {
        const d = node.data as PivotNodeData;
        const sourceRef = inputs.find((x) => x.edge.targetHandle === 'in')?.ref || inputs[0]?.ref;
        const sourceRows = await loadRows(sourceRef);
        if (!d.indexColumn || !d.pivotColumn || !d.valueColumn) {
          setOutput('out', sourceRef || {});
        } else {
          const groups = new Map<string, Row>();
          sourceRows.forEach((r) => {
            const idxVal = r[d.indexColumn];
            const pivotKey = r[d.pivotColumn];
            const val = r[d.valueColumn];
            const key = JSON.stringify(idxVal);
            const bucket = groups.get(key) || { [d.indexColumn]: idxVal };
            if (pivotKey !== undefined && pivotKey !== null) {
              bucket[String(pivotKey)] = val;
            }
            groups.set(key, bucket);
          });
          const out = Array.from(groups.values());
          setOutput('out', await persistRows(out));
        }
      } else if (node.type === 'sort') {
        const d = node.data as SortNodeData;
        const sourceRef = inputs.find((x) => x.edge.targetHandle === 'in')?.ref || inputs[0]?.ref;
        const sourceRows = await loadRows(sourceRef);
        if (!d.field) {
          setOutput('out', sourceRef || {});
        } else {
          const out = [...sourceRows].sort((a, b) => {
            const av = a[d.field as string];
            const bv = b[d.field as string];
            if (av === bv) return 0;
            if (av === undefined || av === null) return 1;
            if (bv === undefined || bv === null) return -1;
            if (av > bv) return d.direction === 'asc' ? 1 : -1;
            if (av < bv) return d.direction === 'asc' ? -1 : 1;
            return 0;
          });
          setOutput('out', await persistRows(out));
        }
      } else if (node.type === 'lookup') {
        const d = node.data as LookupNodeData;
        const sourceRef = inputs.find((x) => x.edge.targetHandle === 'in')?.ref || inputs[0]?.ref;
        const sourceRows = await loadRows(sourceRef);
        const map = d.map || {};
        const newField = d.newField || d.field || 'lookup';
        const out = d.field
          ? sourceRows.map((r) => ({ ...r, [newField as string]: map[r[d.field as string]] ?? r[newField as string] }))
          : sourceRows;
        setOutput('out', await persistRows(out));
      } else if (node.type === 'typeCast') {
        const d = node.data as TypeCasterNodeData;
        const sourceRef = inputs.find((x) => x.edge.targetHandle === 'in')?.ref || inputs[0]?.ref;
        const sourceRows = await loadRows(sourceRef);
        if (!d.field) {
          setOutput('out', sourceRef || {});
        } else {
          const out = sourceRows.map((r) => {
            const val = r[d.field as string];
            let casted: any = val;
            switch (d.targetType) {
              case 'number':
                casted = Number(val);
                break;
              case 'boolean':
                casted = typeof val === 'boolean' ? val : ['true', '1', 'yes'].includes(String(val).toLowerCase());
                break;
              case 'date':
                casted = val ? new Date(val) : null;
                break;
              default:
                casted = val?.toString();
            }
            return { ...r, [d.field as string]: casted };
          });
          setOutput('out', await persistRows(out));
        }
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
      } else if (node.type === 'joinVertical') {
        const _d = node.data as JoinVerticalNodeData;
        const topRef = inputs.find((x) => x.edge.targetHandle === 'input-top')?.ref;
        const bottomRef = inputs.find((x) => x.edge.targetHandle === 'input-bottom')?.ref;
        const top = await loadRows(topRef);
        const bottom = await loadRows(bottomRef);
        const fields = new Set<string>();
        top.forEach((r) => Object.keys(r).forEach((k) => fields.add(k)));
        bottom.forEach((r) => Object.keys(r).forEach((k) => fields.add(k)));
        const cols = Array.from(fields);
        const normalize = (rows: Row[]) => rows.map((r) => {
          const next: Row = {};
          cols.forEach((c) => { next[c] = r[c]; });
          return next;
        });
        const out = [...normalize(top), ...normalize(bottom)];
        setOutput('output-stacked', await persistRows(out));
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
