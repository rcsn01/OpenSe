/* eslint-disable no-restricted-globals */
// Web Worker for Heavy Data Processing
import Papa from 'papaparse';
import { db, DatasetChunk } from '../lib/db';

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  try {
    let result;
    switch (type) {
      case 'FILTER':
        result = payload.data.filter((row: any) => row[payload.column] > payload.value);
        break;
      case 'MAP_REMOVE_COLUMN':
        result = payload.data.map((row: any) => {
          const { [payload.column]: _, ...rest } = row;
          return rest;
        });
        break;
      case 'PARSE_CSV': {
        const file: File = payload.file;
        const datasetId = crypto.randomUUID();
        const batchSize = 1000;
        let buffer: any[] = [];
        let total = 0;
        let chunkIndex = 0;
        let schema: string[] = [];
        let preview: any[] = [];

        await new Promise<void>((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            worker: false,
            step: async (row) => {
              if (!schema.length) schema = Object.keys(row.data || {});
              if (preview.length < 10) preview.push(row.data);
              buffer.push(row.data);
              total += 1;
              if (buffer.length >= batchSize) {
                const chunk: DatasetChunk = { datasetId, index: chunkIndex++, rows: buffer };
                await db.datasetChunks.add(chunk);
                buffer = [];
              }
            },
            complete: async () => {
              try {
                if (buffer.length) {
                  const chunk: DatasetChunk = { datasetId, index: chunkIndex++, rows: buffer };
                  await db.datasetChunks.add(chunk);
                  buffer = [];
                }

                await db.datasets.put({
                  id: datasetId,
                  schema,
                  count: total,
                  chunkCount: chunkIndex,
                  timestamp: Date.now(),
                });

                result = {
                  datasetId,
                  schema,
                  count: total,
                  chunkCount: chunkIndex,
                  preview,
                };
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            error: (err) => reject(err),
          });
        });
        break;
      }
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }

    // Send back success
    self.postMessage({ id, status: 'success', result });
  } catch (error) {
    // Send back error
    self.postMessage({ id, status: 'error', error: (error as Error).message });
  }
};

export {};
