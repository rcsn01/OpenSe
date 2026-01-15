import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

type QueryFunction<T> = () => Promise<{ data: T | null; error: any }>;

interface UseSupabaseQueryOptions {
  enabled?: boolean;
  timeout?: number;
  refetchOnWindowFocus?: boolean;
}

export function useSupabaseQuery<T>(
  queryFn: QueryFunction<T>,
  dependencies: any[] = [],
  options: UseSupabaseQueryOptions = {}
) {
  const { 
    enabled = true, 
    timeout = 10000, 
    refetchOnWindowFocus = true 
  } = options;
  
  const { user } = useAuth();
  const [data, setData] = useState<T | []>([]); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (isRetry = false) => {
    if (!enabled || !user) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    if (!isRetry) setError(null);

    try {
      // 1. Mark when we started
      const startTime = Date.now();

      const timeoutPromise = new Promise((_, reject) => {
        const id = setTimeout(() => {
          // 2. Calculate how much time REALLY passed
          const timePassed = Date.now() - startTime;
          const drift = timePassed - timeout;

          // 3. If the timer is > 1 second late, the browser was sleeping.
          // Don't fail the request; just cancel it silently.
          if (drift > 1000) {
             reject(new Error('Browser_Suspended'));
          } else {
             reject(new Error('Request timed out'));
          }
        }, timeout);
        
        controller.signal.addEventListener('abort', () => clearTimeout(id));
      });

      const queryPromise = queryFn();

      // 4. Race the query against the smart timeout
      const result: any = await Promise.race([queryPromise, timeoutPromise]);

      if (!controller.signal.aborted) {
        if (result.error) throw result.error;
        setData(result.data || []);
        setError(null);
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        // 5. Catch the specific "Browser Suspended" error and ignore it
        if (err.message === 'Browser_Suspended') {
           console.log('Tab woke up: Ignoring old timeout.');
        } else if (err.message === 'Request timed out') {
           setError('Network request timed out.');
        } else {
           console.error('Query error:', err);
           setError(err.message || 'Failed to fetch data');
        }
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [user, enabled, timeout, ...dependencies]);

  // Initial Fetch
  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Refetch when tab becomes active again
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return;

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
         // Force a fresh fetch when user comes back
         fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [fetchData, refetchOnWindowFocus, enabled]);

  return { data, loading, error, refresh: fetchData };
}