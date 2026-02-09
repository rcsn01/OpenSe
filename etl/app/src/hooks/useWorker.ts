import { useCallback, useRef, useEffect } from 'react';

interface WorkerResponse {
  id: string;
  status: 'success' | 'error';
  result?: any;
  error?: string;
}

export const useWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const promisesRef = useRef<Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>>(new Map());

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(new URL('../workers/dataProcessor.worker.ts', import.meta.url), {
      type: 'module',
    });

    // Handle messages from worker
    workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, status, result, error } = event.data;
      const promise = promisesRef.current.get(id);

      if (promise) {
        if (status === 'success') {
          promise.resolve(result);
        } else {
          promise.reject(error);
        }
        promisesRef.current.delete(id);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const runWorkerTask = useCallback((type: string, payload: any) => {
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      promisesRef.current.set(id, { resolve, reject });
      workerRef.current?.postMessage({ id, type, payload });
    });
  }, []);

  return { runWorkerTask };
};
