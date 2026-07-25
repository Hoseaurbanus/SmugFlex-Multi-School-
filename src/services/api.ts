/**
 * API Service
 * SMugFlex 2.0 Multi-School Management Platform
 */

import { API_CONFIG, buildUrl, getAuthToken, setAuthToken, removeAuthToken } from '../config/api';
import { CapacitorHelper } from '../utils/capacitorHelper';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T | PaginatedData<T>;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedData<T = any> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

class ApiService {
  private connectionStatus: { isOnline: boolean; isSlow: boolean } = { isOnline: true, isSlow: false };

  constructor() {
    
    // Monitor connection status
    this.updateConnectionStatus();
    window.addEventListener('online', () => this.updateConnectionStatus());
    window.addEventListener('offline', () => this.updateConnectionStatus());
  }

  private updateConnectionStatus() {
    this.connectionStatus.isOnline = navigator.onLine;
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      this.connectionStatus.isSlow = connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g' || connection.downlink < 0.5;
    }
  }

  setConnectionContext(connection: { isOnline: boolean; isSlow: boolean }) {
    this.connectionStatus = connection;
  }

  /**
   * Make HTTP request with proper error handling and retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = 3 // Increased retries for low networks
  ): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint);
    const token = getAuthToken();

    const method = String(options.method || 'GET').toUpperCase();
    const isIdempotentMethod = method === 'GET' || method === 'HEAD';

    // Default headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Prevent browsers/proxies from caching GET/HEAD responses (fixes stale data until cache clear)
    if (isIdempotentMethod) {
      (headers as any)['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      (headers as any)['Pragma'] = 'no-cache';
      (headers as any)['Expires'] = '0';
    }

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Adaptive timeout based on connection status
    const baseTimeout = API_CONFIG.TIMEOUT;
    const adaptiveTimeout = this.connectionStatus.isSlow ? baseTimeout * 2 : baseTimeout;

    // Merge with provided headers
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    // Retry logic for network/server/auth errors
    const maxAttempts = isIdempotentMethod ? retries : 1;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), adaptiveTimeout);
        const config: RequestInit = {
          ...options,
          headers,
          signal: controller.signal,
          ...(isIdempotentMethod ? { cache: 'no-store' as RequestCache } : {}),
        };
        const response = await fetch(url, config);
        clearTimeout(timeoutId);
        
        const contentType = response.headers.get('content-type') || '';
        let data: any;
        
        if (response.status === 204 || !contentType.includes('application/json')) {
          data = { success: response.ok };
        } else {
          data = await response.json();
        }

        // Handle authentication errors with token refresh
        if (response.status === 401) {
          try {
            const refreshResponse = await this.refreshToken();
            if (refreshResponse && refreshResponse.success && refreshResponse.data?.token) {
              setAuthToken(refreshResponse.data.token);
              const retryResponse = await fetch(url, {
                ...config,
                headers: {
                  ...headers,
                  'Authorization': `Bearer ${refreshResponse.data.token}`
                }
              });
              
              const retryData = retryResponse.ok ? await retryResponse.json() : { success: false };
              return retryData;
            }
          } catch (refreshError) {
            removeAuthToken();
            if (attempt < retries - 1) {
              if ((headers as any)['Authorization']) {
                delete (headers as any)['Authorization'];
              }
              const baseDelay = this.connectionStatus.isSlow ? 1000 : 500;
              await new Promise(resolve => setTimeout(resolve, baseDelay * (attempt + 1)));
              continue;
            }
            throw new Error('Session expired. Please login again.');
          }
        }

        if (!response.ok) {
          if (isIdempotentMethod && response.status >= 500 && attempt < maxAttempts - 1) {
            const baseDelay = this.connectionStatus.isSlow ? 2000 : 1000;
            await new Promise(resolve => setTimeout(resolve, baseDelay * (attempt + 1)));
            continue;
          }
          throw new Error(data?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        // Normalize payload-level failures (e.g., success:false with embedded status)
        if (data && typeof data === 'object' && data.success === false) {
          const payloadStatus = typeof data.status === 'number' ? data.status : Number(data.status);
          const statusCode = Number.isFinite(payloadStatus) ? payloadStatus : response.status;
          const msg = data.error || data.message || 'Request failed';
          // If backend embeds 401/403/4xx in JSON while HTTP status is 200, surface it as an error
          if (statusCode >= 400) {
            if ((statusCode === 401 || statusCode === 403) && (headers as any)['Authorization']) {
              removeAuthToken();
              if (attempt < retries - 1) {
                delete (headers as any)['Authorization'];
                const baseDelay = this.connectionStatus.isSlow ? 1000 : 500;
                await new Promise(resolve => setTimeout(resolve, baseDelay * (attempt + 1)));
                continue;
              }
            }
            throw new Error(`${statusCode} ${msg}`);
          }
          // Otherwise still treat success:false as an error
          throw new Error(msg);
        }

        // API Request successful
        return data;

      } catch (error: any) {
        // timeoutId cleared above in try block; safe to continue
        
        if (error.name === 'AbortError') {
          if (isIdempotentMethod && attempt < maxAttempts - 1) {
            const baseDelay = this.connectionStatus.isSlow ? 2000 : 1000;
            await new Promise(resolve => setTimeout(resolve, baseDelay * (attempt + 1)));
            continue;
          }
          throw new Error('Request timeout. Please check your connection.');
        }
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          if (isIdempotentMethod && attempt < maxAttempts - 1) {
            const baseDelay = this.connectionStatus.isSlow ? 4000 : 2000;
            await new Promise(resolve => setTimeout(resolve, baseDelay * (attempt + 1)));
            continue;
          }
          throw new Error('Network connection failed. Please check your internet connection.');
        }
        
        throw error;
      }
    }

    throw new Error('Request failed after multiple attempts.');
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint;
    
    // Add query parameters
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.request<T>(url, { method: 'GET' });
  }

  /**
   * Refresh authentication token
   */
  private async refreshToken(): Promise<ApiResponse | null> {
    try {
      const token = getAuthToken();
      if (!token) {
        return null;
      }

      const response = await fetch(buildUrl('/auth/refresh-token'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Upload file
   */
  async upload<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    // Add additional form data
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const token = getAuthToken();
    const headers: HeadersInit = {
      'Accept': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers, // Don't set Content-Type for FormData (browser sets it automatically)
    });
  }

  /**
   * Download file
   */
  async download(endpoint: string, filename?: string): Promise<void> {
    const url = buildUrl(endpoint);
    const token = getAuthToken();

    const headers: HeadersInit = {
      'Accept': 'application/octet-stream',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      // Get filename from Content-Disposition header if not provided
      if (!filename) {
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
      }

      // Create blob and download
      const blob = await response.blob();
      await CapacitorHelper.downloadFile(blob, filename || 'download', blob.type || 'application/octet-stream');
    } catch (error) {
      throw new Error('Download failed. Please try again.');
    }
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    setAuthToken(token);
  }

  /**
   * Remove authentication token
   */
  clearToken(): void {
    removeAuthToken();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!getAuthToken();
  }
}

// Create singleton instance
const apiService = new ApiService();

// Export individual methods for convenience
export const api = {
  get: <T>(endpoint: string, params?: Record<string, any>) => apiService.get<T>(endpoint, params),
  post: <T>(endpoint: string, data?: any) => apiService.post<T>(endpoint, data),
  put: <T>(endpoint: string, data?: any) => apiService.put<T>(endpoint, data),
  delete: <T>(endpoint: string) => apiService.delete<T>(endpoint),
  patch: <T>(endpoint: string, data?: any) => apiService.patch<T>(endpoint, data),
  upload: <T>(endpoint: string, file: File, additionalData?: Record<string, any>) => 
    apiService.upload<T>(endpoint, file, additionalData),
  download: (endpoint: string, filename?: string) => apiService.download(endpoint, filename),
  setToken: (token: string) => apiService.setToken(token),
  clearToken: () => apiService.clearToken(),
  isAuthenticated: () => apiService.isAuthenticated(),
};

export default apiService;
