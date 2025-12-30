/**
 * Admin Page Optimization Utilities
 * Provides centralized permission checking and performance optimizations for admin pages
 */

import { ensureAuthToken } from './tokenManager';

// Permission levels for admin pages
export enum AdminPermission {
  VIEW = 'view',
  EDIT = 'edit',
  DELETE = 'delete',
  CREATE = 'create',
  MANAGE_USERS = 'manage_users',
  SYSTEM_SETTINGS = 'system_settings',
  APPROVE_RESULTS = 'approve_results',
  MANAGE_FINANCES = 'manage_finances',
  FULL_ACCESS = 'full_access'
}

// Page access control configuration
export interface PageAccessConfig {
  requiredRole: string;
  requiredPermissions: AdminPermission[];
  allowHigherRoles?: boolean;
}

// Predefined page access configurations
export const PAGE_ACCESS_CONFIGS: Record<string, PageAccessConfig> = {
  'ManageStudentsPage': {
    requiredRole: 'admin',
    requiredPermissions: [AdminPermission.VIEW, AdminPermission.EDIT, AdminPermission.DELETE, AdminPermission.CREATE],
    allowHigherRoles: true
  },
  'ManageTeachersPage': {
    requiredRole: 'admin',
    requiredPermissions: [AdminPermission.VIEW, AdminPermission.EDIT, AdminPermission.DELETE, AdminPermission.CREATE],
    allowHigherRoles: true
  },
  'ManageParentsPage': {
    requiredRole: 'admin',
    requiredPermissions: [AdminPermission.VIEW, AdminPermission.EDIT, AdminPermission.DELETE, AdminPermission.CREATE],
    allowHigherRoles: true
  },
  'SystemSettingsPage': {
    requiredRole: 'admin',
    requiredPermissions: [AdminPermission.SYSTEM_SETTINGS],
    allowHigherRoles: false
  },
  'ApproveResultsPage': {
    requiredRole: 'admin',
    requiredPermissions: [AdminPermission.APPROVE_RESULTS],
    allowHigherRoles: true
  },
  'FeeManagementPage': {
    requiredRole: 'admin',
    requiredPermissions: [AdminPermission.MANAGE_FINANCES],
    allowHigherRoles: true
  },
  'UserManagementPage': {
    requiredRole: 'admin',
    requiredPermissions: [AdminPermission.MANAGE_USERS],
    allowHigherRoles: false
  }
};

// Performance optimization utilities
export class AdminPageOptimizer {
  private static loadingCache = new Map<string, any>();
  private static permissionCache = new Map<string, boolean>();

  /**
   * Check if user has permission to access a page
   */
  static async checkPageAccess(
    pageName: string, 
    currentUser: any,
    requiredPermissions?: AdminPermission[]
  ): Promise<boolean> {
    const cacheKey = `${pageName}_${currentUser?.id || 'unknown'}_${currentUser?.role || 'unknown'}`;
    
    // Check cache first
    if (this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey) || false;
    }

    // Ensure authentication token
    const tokenEnsured = await ensureAuthToken(currentUser);
    if (!tokenEnsured) {
      return false;
    }

    const config = PAGE_ACCESS_CONFIGS[pageName];
    if (!config) {
      // Default to admin-only access for pages without explicit config
      return currentUser?.role === 'admin';
    }

    // Check role requirements
    if (currentUser?.role !== config.requiredRole) {
      if (!config.allowHigherRoles || currentUser?.role !== 'admin') {
        this.permissionCache.set(cacheKey, false);
        return false;
      }
    }

    // Check specific permissions if provided
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every(permission => 
        this.hasPermission(currentUser, permission)
      );
      this.permissionCache.set(cacheKey, hasAllPermissions);
      return hasAllPermissions;
    }

    this.permissionCache.set(cacheKey, true);
    return true;
  }

  /**
   * Check if user has specific permission
   */
  private static hasPermission(user: any, permission: AdminPermission): boolean {
    if (!user || user.role !== 'admin') {
      return false;
    }

    // For now, all admin users have all permissions
    // This can be extended to support role-based permissions
    return true;
  }

  /**
   * Optimized data loading with caching
   */
  static async loadWithCache<T>(
    key: string,
    loader: () => Promise<T>,
    cacheDuration: number = 300000 // 5 minutes default
  ): Promise<T> {
    const cached = this.loadingCache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      return cached.data;
    }

    const data = await loader();
    this.loadingCache.set(key, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  /**
   * Clear cache for specific key or all cache
   */
  static clearCache(key?: string): void {
    if (key) {
      this.loadingCache.delete(key);
      this.permissionCache.delete(key);
    } else {
      this.loadingCache.clear();
      this.permissionCache.clear();
    }
  }

  /**
   * Debounced search for performance
   */
  static createDebouncedSearch<T>(
    searchFn: (query: string) => Promise<T>,
    delay: number = 300
  ): (query: string) => Promise<T> {
    let timeoutId: NodeJS.Timeout;
    
    return (query: string): Promise<T> => {
      return new Promise((resolve) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          const result = await searchFn(query);
          resolve(result);
        }, delay);
      });
    };
  }

  /**
   * Memoized filtering for large datasets
   */
  static createMemoizedFilter<T>(
    items: T[],
    filterFn: (item: T, query: string) => boolean
  ): (query: string) => T[] {
    const cache = new Map<string, T[]>();
    
    return (query: string): T[] => {
      if (cache.has(query)) {
        return cache.get(query)!;
      }

      const filtered = items.filter(item => filterFn(item, query));
      cache.set(query, filtered);
      
      // Limit cache size
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        if (firstKey !== undefined) {
          cache.delete(firstKey);
        }
      }

      return filtered;
    };
  }

  /**
   * Batch data loading for multiple API calls
   */
  static async batchLoad<T>(loaders: Array<() => Promise<T>>): Promise<(T | null)[]> {
    try {
      const results = await Promise.allSettled(loaders.map(loader => loader()));
      return results.map(result => 
        result.status === 'fulfilled' ? result.value : null
      );
    } catch (error) {
      console.error('Batch loading failed:', error);
      return [];
    }
  }

  /**
   * Progressive loading for large datasets
   */
  static async* progressiveLoad<T>(
    loader: (offset: number, limit: number) => Promise<T[]>,
    batchSize: number = 50
  ): AsyncGenerator<T[]> {
    let offset = 0;
    
    while (true) {
      const batch = await loader(offset, batchSize);
      
      if (!batch || batch.length === 0) {
        break;
      }
      
      yield batch;
      offset += batchSize;
      
      // Small delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

// React hook for admin page optimizations
export function useAdminPageOptimizations(pageName: string, currentUser: any) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log(`useAdminPageOptimizations - Checking access for ${pageName}`, { currentUser });
    
    const checkAccess = async () => {
      try {
        const access = await AdminPageOptimizer.checkPageAccess(pageName, currentUser);
        console.log(`useAdminPageOptimizations - Access result for ${pageName}:`, access);
        setHasAccess(access);
      } catch (error) {
        console.error(`useAdminPageOptimizations - Error checking access for ${pageName}:`, error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      checkAccess();
    } else {
      console.log(`useAdminPageOptimizations - No current user, denying access to ${pageName}`);
      setHasAccess(false);
      setLoading(false);
    }
  }, [pageName, currentUser]);

  return {
    hasAccess,
    loading,
    loadWithCache: AdminPageOptimizer.loadWithCache,
    createDebouncedSearch: AdminPageOptimizer.createDebouncedSearch,
    createMemoizedFilter: AdminPageOptimizer.createMemoizedFilter,
    batchLoad: AdminPageOptimizer.batchLoad,
    clearCache: AdminPageOptimizer.clearCache
  };
}

// Import useState and useEffect for the hook
import { useState, useEffect } from 'react';
