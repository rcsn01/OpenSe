import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

type QueryFunction<T> = () => Promise<{ data: T | null; error: any }>;

interface UseSupabaseQueryOptions {
  enabled?: boolean;
  timeout?: number;
}

export function useSupabaseQuery<T>(
  queryFn: QueryFunction<T>,
  dependencies: any[] = [],
  options: UseSupabaseQueryOptions = {}
) {
  const { enabled = true, timeout = 10000 } = options;
  const { user } = useAuth();

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !user) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Request timed out - check connection'));
        }, timeout);
        controller.signal.addEventListener('abort', () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        });
      });

      const queryPromise = queryFn();
      const result: any = await Promise.race([queryPromise, timeoutPromise]);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!controller.signal.aborted) {
        if (result.error) throw result.error;
        setData(result.data ?? null);
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        console.error('Query failed:', err);
        setError(err.message || 'Failed to fetch data');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [enabled, user, timeout, queryFn, ...dependencies]);

  useEffect(() => {
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
