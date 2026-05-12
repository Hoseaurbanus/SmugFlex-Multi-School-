/**
 * Authentication Service
 * Graceland Royal Academy School Management System
 * Centralized token management and authentication utilities
 */

import { API_CONFIG, getAuthToken, setAuthToken, removeAuthToken, getCurrentUser as getCurrentUserFromConfig, setCurrentUser as setCurrentUserFromConfig } from '../config/api';

export interface AuthUser {
  id: number;
  username: string;
  role: 'admin' | 'teacher' | 'accountant' | 'parent';
  linked_id: number;
  email: string;
  first_name: string;
  last_name: string;
  linked_email: string;
  token: string;
  permissions: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
  role: 'admin' | 'teacher' | 'accountant' | 'parent';
}

export class AuthService {
  private static instance: AuthService;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Login user and store authentication tokens
   */
  public async login(credentials: LoginRequest): Promise<AuthUser | null> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.message || 'Login failed');
      }

      const user = result.data as AuthUser;

      // Store authentication data
      this.setAuthData(user);

      // Setup token refresh timer
      this.setupTokenRefresh();

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Logout user and clear authentication data
   */
  public async logout(): Promise<void> {
    try {
      // Call logout endpoint if available
      const token = getAuthToken();
      if (token) {
        try {
          await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.LOGOUT}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });
        } catch (error) {
          // Silent fail for security
        }
      }
    } catch (error) {
      // Silent fail for security
    } finally {
      // Always clear local data
      this.clearAuthData();
    }
  }

  /**
   * Get current authenticated user
   */
  public getCurrentUser(): AuthUser | null {
    const user = getCurrentUserFromConfig();
    const token = getAuthToken();

    if (!user || !token) {
      return null;
    }

    return user as AuthUser;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    const token = getAuthToken();
    const user = this.getCurrentUser();
    
    return !!(token && user);
  }

  /**
   * Check if user has specific permission
   */
  public hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    
    if (!user || !user.permissions) {
      return false;
    }

    return user.permissions.includes(permission);
  }

  /**
   * Check if user has specific role
   */
  public hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    
    if (!user) {
      return false;
    }

    return user.role === role;
  }

  /**
   * Get authorization header for API requests
   */
  public getAuthHeader(): { Authorization?: string } {
    const token = getAuthToken();
    
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    
    return {};
  }

  /**
   * Refresh authentication token
   */
  public async refreshToken(): Promise<boolean> {
    try {
      const token = getAuthToken();
      
      if (!token) {
        return false;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.REFRESH_TOKEN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const result = await response.json();

      if (result.success && result.data?.token) {
        setAuthToken(result.data.token);
        
        // Update current user data
        const currentUser = this.getCurrentUser();
        if (currentUser) {
          setCurrentUserFromConfig({
            ...currentUser,
            token: result.data.token,
          });
        }

        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Setup automatic token refresh
   */
  private setupTokenRefresh(): void {
    // Clear existing timer
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
    }

    // Setup refresh timer (every 30 minutes)
    this.tokenRefreshTimer = setInterval(async () => {
      try {
        const refreshed = await this.refreshToken();
        
        if (!refreshed) {
          this.clearAuthData();
          window.location.href = '/login';
        }
      } catch (error) {
        this.clearAuthData();
        window.location.href = '/login';
      }
    }, 30 * 60 * 1000); // 30 minutes
  }

  /**
   * Store authentication data
   */
  private setAuthData(user: AuthUser): void {
    setAuthToken(user.token);
    setCurrentUserFromConfig(user);
  }

  /**
   * Clear authentication data
   */
  private clearAuthData(): void {
    removeAuthToken();
    
    // Clear token refresh timer
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  /**
   * Validate token format and expiration
   */
  public validateToken(token: string): boolean {
    try {
      if (!token) {
        return false;
      }

      // Basic JWT format check (3 parts separated by dots)
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }

      // Decode payload to check expiration
      const payload = JSON.parse(atob(parts[1]));
      
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get token expiration time
   */
  public getTokenExpiration(token: string): Date | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(atob(parts[1]));
      
      if (payload.exp) {
        return new Date(payload.exp * 1000);
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();

// Export convenience functions
export const login = (credentials: LoginRequest) => authService.login(credentials);
export const logout = () => authService.logout();
export const getCurrentUser = () => authService.getCurrentUser();
export const isAuthenticated = () => authService.isAuthenticated();
export const hasPermission = (permission: string) => authService.hasPermission(permission);
export const hasRole = (role: string) => authService.hasRole(role);
export const getAuthHeader = () => authService.getAuthHeader();
export const refreshToken = () => authService.refreshToken();
export const validateToken = (token: string) => authService.validateToken(token);
