import { db } from '../db';
import { Row } from '../../components/nodes/types';

export type DataRef = {
  datasetId?: string;
  schema?: string[];
  preview?: Row[];
  count?: number;
};

export type ExecutionDownload = { csv: string; filename: string };

export const toCsv = (rows: Row[]) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  rows.forEach((r) => {
    lines.push(headers.map((h) => JSON.stringify(r[h] ?? '')).join(','));
  });
  return lines.join('\n');
};

export const loadRows = async (ref: DataRef | undefined, fallbackRows: Row[] = []) => {
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

export const persistRows = async (rows: Row[]): Promise<DataRef> => {
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
