/**
 * Performance Optimizations
 * SMugFlex 2.0 Multi-School Management Platform
 */

import { useEffect, useState, useCallback } from 'react';

// Debounce hook for API calls
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Network status monitoring
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const checkConnection = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      if (connection) {
        setIsSlow(connection.effectiveType === 'slow-2g' || 
                 connection.effectiveType === '2g' || 
                 connection.downlink < 0.5);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    checkConnection();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isSlow };
}

// API request caching
const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export function useApiCache(ttl: number = 300000) { // 5 minutes default TTL
  const getCached = useCallback((key: string) => {
    const cached = apiCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    return null;
  }, []);

  const setCache = useCallback((key: string, data: any, customTtl?: number) => {
    apiCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: customTtl || ttl
    });
  }, [ttl]);

  const clearCache = useCallback((pattern?: string) => {
    if (pattern) {
      for (const key of apiCache.keys()) {
        if (key.includes(pattern)) {
          apiCache.delete(key);
        }
      }
    } else {
      apiCache.clear();
    }
  }, []);

  return { getCached, setCache, clearCache };
}

// Performance monitoring
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    apiCalls: 0,
    errors: 0,
    slowRequests: 0
  });

  const trackApiCall = useCallback((duration: number, isError: boolean = false) => {
    setMetrics(prev => ({
      ...prev,
      apiCalls: prev.apiCalls + 1,
      errors: isError ? prev.errors + 1 : prev.errors,
      slowRequests: duration > 3000 ? prev.slowRequests + 1 : prev.slowRequests
    }));
  }, []);

  const recordLoadTime = useCallback((time: number) => {
    setMetrics(prev => ({ ...prev, loadTime: time }));
  }, []);

  return { metrics, trackApiCall, recordLoadTime };
}

// Lazy image loading
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
    };
    img.onerror = () => {
      setImageSrc(placeholder || '');
      setIsLoading(false);
    };
    img.src = src;
  }, [src, placeholder]);

  return { imageSrc, isLoading };
}
