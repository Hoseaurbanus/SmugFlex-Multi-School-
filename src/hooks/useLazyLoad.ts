import { useState, useEffect, useCallback, useRef } from 'react';

interface LazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export function useLazyLoad<T>(
  loader: () => Promise<T>,
  options: LazyLoadOptions = {}
) {
  const { threshold = 0.1, rootMargin = '50px', enabled = true } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loaded, setLoaded] = useState(false);
  
  const elementRef = useRef<HTMLElement>(null);
  const loaderRef = useRef<(() => Promise<T>) | null>(null);
  
  loaderRef.current = loader;

  const load = useCallback(async () => {
    if (!enabled || loaded || loading || !loaderRef.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await loaderRef.current();
      setData(result);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  }, [enabled, loaded, loading]);

  useEffect(() => {
    if (!enabled || loaded) return;

    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            load();
            observer.disconnect();
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [enabled, loaded, threshold, rootMargin, load]);

  return {
    data,
    loading,
    error,
    loaded,
    elementRef,
    load,
    refetch: load
  };
}

export function useLazyComponent<T extends React.ComponentType<any>>(
  componentLoader: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
) {
  const [Component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadComponent = useCallback(async () => {
    if (Component || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const module = await componentLoader();
      setComponent(() => module.default);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load component'));
    } finally {
      setLoading(false);
    }
  }, [Component, loading, componentLoader]);

  return {
    Component,
    loading,
    error,
    loadComponent,
    refetch: loadComponent
  };
}
