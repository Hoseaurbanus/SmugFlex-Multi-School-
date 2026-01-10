import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

interface BatchRequest<T> {
  key: string;
  endpoint: string;
  params?: Record<string, any>;
  useCache?: boolean;
  resolve: (data: T) => void;
  reject: (error: Error) => void;
}

interface BatchApiOptions {
  batchDelay?: number; // Delay in ms to batch requests
  maxBatchSize?: number;
}

export function useBatchApi(options: BatchApiOptions = {}) {
  const { batchDelay = 50, maxBatchSize = 10 } = options;
  const [isLoading, setIsLoading] = useState(false);
  const pendingRequests = useRef<BatchRequest<any>[]>([]);
  const batchTimeout = useRef<NodeJS.Timeout | null>(null);

  const processBatch = useCallback(async () => {
    if (pendingRequests.current.length === 0) return;

    const batch = pendingRequests.current.splice(0, maxBatchSize);
    setIsLoading(true);

    try {
      // Process requests in parallel but with controlled concurrency
      const promises = batch.map(async (request) => {
        try {
          const response = await api.get(request.endpoint, request.params);
          if (response.success) {
            request.resolve(response.data);
          } else {
            request.reject(new Error(response.message || 'Request failed'));
          }
        } catch (error) {
          request.reject(error instanceof Error ? error : new Error('Unknown error'));
        }
      });

      await Promise.allSettled(promises);
    } finally {
      setIsLoading(false);
      
      // Process next batch if there are more requests
      if (pendingRequests.current.length > 0) {
        batchTimeout.current = setTimeout(processBatch, batchDelay);
      }
    }
  }, [batchDelay, maxBatchSize]);

  const batchRequest = useCallback(<T>(
    endpoint: string,
    params?: Record<string, any>,
    useCache = true
  ): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const key = `${endpoint}_${JSON.stringify(params || {})}`;
      
      pendingRequests.current.push({
        key,
        endpoint,
        params,
        useCache,
        resolve,
        reject
      });

      // Start batch processing if not already running
      if (!batchTimeout.current) {
        batchTimeout.current = setTimeout(processBatch, batchDelay);
      }
    });
  }, [processBatch, batchDelay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current);
      }
    };
  }, []);

  return {
    batchRequest,
    isLoading,
    pendingCount: pendingRequests.current.length
  };
}

// Hook for deduplicated requests
export function useDeduplicatedApi() {
  const activeRequests = useRef<Map<string, Promise<any>>>(new Map());

  const deduplicatedRequest = useCallback(<T>(
    endpoint: string,
    params?: Record<string, any>,
    useCache = true
  ): Promise<T> => {
    const key = `${endpoint}_${JSON.stringify(params || {})}`;
    
    // Return existing promise if request is already in flight
    if (activeRequests.current.has(key)) {
      return activeRequests.current.get(key) as Promise<T>;
    }

    // Create new request
    const promise = api.get<T>(endpoint, params)
      .then(response => {
        activeRequests.current.delete(key);
        if (response.success) {
          return response.data;
        }
        throw new Error(response.message || 'Request failed');
      })
      .catch(error => {
        activeRequests.current.delete(key);
        throw error;
      }) as Promise<T>;

    activeRequests.current.set(key, promise);
    return promise;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRequests.current.clear();
    };
  }, []);

  return {
    deduplicatedRequest,
    activeRequests: Array.from(activeRequests.current.keys())
  };
}

// Hook for request debouncing
export function useDebouncedApi(delay = 300) {
  const debouncedRequests = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const debouncedRequest = useCallback(<T>(
    endpoint: string,
    params?: Record<string, any>,
    useCache = true
  ): Promise<T> => {
    const key = `${endpoint}_${JSON.stringify(params || {})}`;
    
    return new Promise<T>((resolve, reject) => {
      // Clear existing timeout for this request
      if (debouncedRequests.current.has(key)) {
        clearTimeout(debouncedRequests.current.get(key)!);
      }

      // Set new timeout
      const timeout = setTimeout(async () => {
        debouncedRequests.current.delete(key);
        
        try {
          const response = await api.get<T>(endpoint, params);
          if (response.success) {
            resolve(response.data as T);
          } else {
            reject(new Error(response.message || 'Request failed'));
          }
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Unknown error'));
        }
      }, delay);

      debouncedRequests.current.set(key, timeout);
    });
  }, [delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedRequests.current.forEach(timeout => clearTimeout(timeout));
      debouncedRequests.current.clear();
    };
  }, []);

  return {
    debouncedRequest,
    cancelRequest: (endpoint: string, params?: Record<string, any>) => {
      const key = `${endpoint}_${JSON.stringify(params || {})}`;
      if (debouncedRequests.current.has(key)) {
        clearTimeout(debouncedRequests.current.get(key)!);
        debouncedRequests.current.delete(key);
      }
    }
  };
}
