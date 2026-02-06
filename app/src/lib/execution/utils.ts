/**
 * Execution utilities for data persistence and CSV generation.
 *
 * Refactored (Audit P4): toCsv now implements RFC 4180 compliant escaping
 * instead of using JSON.stringify, which produced incorrect output when
 * values contained commas, double quotes, or newlines.
 */
import { db } from '../db';
import { Row } from '../../components/nodes/types';

export type DataRef = {
  datasetId?: string;
  schema?: string[];
  preview?: Row[];
  count?: number;
};

export type ExecutionDownload = { csv: string; filename: string };

/**
 * Escapes a single CSV field per RFC 4180:
 * - If the field contains a comma, double quote, or newline, wrap in double quotes
 * - Double quotes within the field are escaped as ""
 */
const escapeCsvField = (value: unknown): string => {
  const str = value === null || value === undefined ? '' : String(value);
  // Must quote if the field contains comma, double-quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Converts an array of rows to RFC 4180 compliant CSV text.
 *
 * Previous implementation used JSON.stringify which:
 * 1. Wrapped all values in quotes unnecessarily
 * 2. Did not escape internal double quotes correctly
 * 3. Did not handle newlines within cell values
 */
export const toCsv = (rows: Row[]): string => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(escapeCsvField).join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCsvField(row[h])).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
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
