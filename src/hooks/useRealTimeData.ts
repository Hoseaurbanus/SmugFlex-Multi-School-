import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface UseRealTimeDataOptions {
  cacheKey: string;
  cacheDuration?: number;
  refreshInterval?: number;
  loadData: () => Promise<any>;
  dependencies?: any[];
  enableVisibilityRefresh?: boolean;
}

export function useRealTimeData<T>({
  cacheKey,
  cacheDuration = 60000, // 1 minute default
  refreshInterval = 60000, // 1 minute default
  loadData,
  dependencies = [],
  enableVisibilityRefresh = true
}: UseRealTimeDataOptions) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(0);
  
  const isMountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load data with caching
  const loadDataWithCache = useCallback(async (forceRefresh = false) => {
    if (!isMountedRef.current) return;
    
    const now = Date.now();
    
    // Skip if not enough time passed and not forcing refresh
    if (!forceRefresh && (now - lastUpdate) < cacheDuration) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Check cache first
      const cached = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(`${cacheKey}_time`);
      
      // Use cached data if fresh enough and not forcing refresh
      if (!forceRefresh && cached && cacheTime && (now - parseInt(cacheTime)) < cacheDuration) {
        setData(JSON.parse(cached));
        setLastUpdate(parseInt(cacheTime));
        setLoading(false);
        return;
      }
      
      // Fetch fresh data
      const result = await loadData();
      
      if (isMountedRef.current && result) {
        // Cache the results
        localStorage.setItem(cacheKey, JSON.stringify(result));
        localStorage.setItem(`${cacheKey}_time`, now.toString());
        
        setData(result);
        setLastUpdate(now);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [cacheKey, cacheDuration, lastUpdate, loadData]);

  // Manual refresh function
  const refresh = useCallback(() => {
    loadDataWithCache(true);
  }, [loadDataWithCache]);

  // Clear cache function
  const clearCache = useCallback(() => {
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_time`);
    setLastUpdate(0);
  }, [cacheKey]);

  // Set up automatic refresh and visibility handling
  useEffect(() => {
    // Initial load
    loadDataWithCache(true);
    
    // Set up visibility change handler
    const handleVisibilityChange = () => {
      if (enableVisibilityRefresh && document.visibilityState === 'visible' && isMountedRef.current) {
        loadDataWithCache(true);
      }
    };
    
    // Set up periodic refresh
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        if (isMountedRef.current && (!enableVisibilityRefresh || document.visibilityState === 'visible')) {
          loadDataWithCache();
        }
      }, refreshInterval);
    }
    
    if (enableVisibilityRefresh) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (enableVisibilityRefresh) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [loadDataWithCache, refreshInterval, enableVisibilityRefresh]);

  // Dependency-based refresh
  useEffect(() => {
    if (dependencies.length > 0) {
      loadDataWithCache(true);
    }
  }, dependencies);

  return {
    data,
    loading,
    error,
    refresh,
    clearCache,
    lastUpdate
  };
}
