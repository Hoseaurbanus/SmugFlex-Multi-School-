interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100, // 100 entries default
      ...config
    };

    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  set<T>(key: string, data: T, ttl?: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.ttl,
      key
    };

    this.cache.set(key, entry);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Remove expired entries
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl
    }));

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // Would need to track hits/misses for this
      entries
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Create different cache instances for different types of data
export const apiCache = new DataCache({
  ttl: 5 * 60 * 1000, // 5 minutes for API data
  maxSize: 50
});

export const staticCache = new DataCache({
  ttl: 30 * 60 * 1000, // 30 minutes for static data
  maxSize: 20
});

export const userCache = new DataCache({
  ttl: 10 * 60 * 1000, // 10 minutes for user data
  maxSize: 10
});

// Cache key generators
export const cacheKeys = {
  teacher: (id: number) => `teacher_${id}`,
  teachers: (params?: string) => `teachers_${params || 'all'}`,
  classes: (params?: string) => `classes_${params || 'all'}`,
  students: (classId: number) => `students_class_${classId}`,
  subjects: (params?: string) => `subjects_${params || 'all'}`,
  scores: (assignmentId: number) => `scores_assignment_${assignmentId}`,
  assignments: (teacherId: number) => `assignments_teacher_${teacherId}`,
  notifications: (userId: number) => `notifications_user_${userId}`,
  attendance: (classId: number, term: string) => `attendance_${classId}_${term}`
};

// Cache helper functions
export const withCache = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  cache: DataCache = apiCache,
  ttl?: number
): Promise<T> => {
  // Try to get from cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  try {
    const data = await fetcher();
    cache.set(key, data, ttl);
    return data;
  } catch (error) {
    // If fetch fails, try to return stale cached data
    const stale = cache.get<T>(key);
    if (stale !== null) {
      console.warn(`Using stale cache for key: ${key}`);
      return stale;
    }
    throw error;
  }
};

// Batch cache operations
export const batchCache = {
  get: <T>(keys: string[], cache: DataCache = apiCache): Map<string, T | null> => {
    const result = new Map<string, T | null>();
    keys.forEach(key => {
      result.set(key, cache.get<T>(key));
    });
    return result;
  },
  
  set: <T>(entries: Array<{ key: string; data: T; ttl?: number }>, cache: DataCache = apiCache): void => {
    entries.forEach(({ key, data, ttl }) => {
      cache.set(key, data, ttl);
    });
  },
  
  delete: (keys: string[], cache: DataCache = apiCache): number => {
    let deleted = 0;
    keys.forEach(key => {
      if (cache.delete(key)) {
        deleted++;
      }
    });
    return deleted;
  }
};

export default DataCache;
