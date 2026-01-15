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
    timeout = 15000, // Increased default timeout to 15s
    refetchOnWindowFocus = true 
  } = options;
  
  const { user } = useAuth();
  
  // Data persists between fetches to prevent UI flashing
  const [data, setData] = useState<T | []>([]); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (isRetry = false) => {
    if (!enabled || !user) return;

    // 1. Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Only set loading true if we aren't "background refreshing" (optional preference)
    // For now, we set it true to show spinner if needed, or you can rely on old data.
    setLoading(true);
    if (!isRetry) setError(null);

    try {
      // 2. Timeout Promise
      const timeoutPromise = new Promise((_, reject) => {
        const id = setTimeout(() => {
          // If the page is hidden, don't error out—just abort silently to wait for focus
          if (document.hidden) {
             reject(new Error('Background_Timeout_Silent')); 
          } else {
             reject(new Error('Request timed out'));
          }
        }, timeout);
        
        controller.signal.addEventListener('abort', () => clearTimeout(id));
      });

      // 3. Supabase Query
      const queryPromise = queryFn();

      // 4. Race
      const result: any = await Promise.race([queryPromise, timeoutPromise]);

      if (!controller.signal.aborted) {
        if (result.error) throw result.error;
        setData(result.data || []);
        setError(null);
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        // Ignore silent background timeouts
        if (err.message === 'Background_Timeout_Silent') {
           console.log('Query paused in background.');
        } else {
           console.error('Query failed:', err.message);
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

  // Refetch on Window Focus (Solves the "Switch Back" issue)
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Small delay to ensure network is awake
        setTimeout(() => fetchData(true), 100);
      }
    };

    const handleFocus = () => {
      // Only trigger if we haven't just triggered from visibility change
      if (document.visibilityState === 'visible') {
         fetchData(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchData, refetchOnWindowFocus, enabled]);

  return { data, loading, error, refresh: fetchData };
}