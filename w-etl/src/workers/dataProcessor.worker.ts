/* eslint-disable no-restricted-globals */
// Web Worker for Heavy Data Processing

self.onmessage = (e: MessageEvent) => {
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
