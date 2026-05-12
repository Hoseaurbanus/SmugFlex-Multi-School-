/**
 * Token Management Utility
 * Provides centralized authentication token management for all API calls
 */

import { getAuthToken, setAuthToken, removeAuthToken, API_CONFIG } from '../config/api';

export interface TokenManager {
  ensureToken: (currentUser?: any) => Promise<boolean>;
  getToken: () => string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
  isTokenValid: () => boolean;
}

class TokenManagerImpl implements TokenManager {
  /**
   * Ensure authentication token is available for API calls
   * @param currentUser - Current user object with token property
   * @returns Promise<boolean> - true if token is available, false otherwise
   */
  async ensureToken(currentUser?: any): Promise<boolean> {
    try {
      // Check if token exists in storage
      let token = getAuthToken();

      // If no token in storage and currentUser has token, set it
      if (!token && currentUser?.token) {

        setAuthToken(currentUser.token);
        token = currentUser.token;
      }

      // If still no token, try to get it from localStorage directly
      if (!token) {
        try {
          const candidates = [
            localStorage.getItem(API_CONFIG.AUTH.USER_KEY),
            localStorage.getItem('currentUser'),
            localStorage.getItem('current_user')
          ].filter(Boolean) as string[];

          for (const storedUser of candidates) {
            const user = JSON.parse(storedUser);
            if (user?.token) {
              setAuthToken(user.token);
              token = user.token;
              break;
            }
          }
        } catch (error) {

          // Clear corrupted data
          localStorage.removeItem(API_CONFIG.AUTH.USER_KEY);
          localStorage.removeItem('currentUser');
          localStorage.removeItem('current_user');
        }
      }

      const isValid = this.isTokenValid();


      return isValid;
    } catch (error) {

      return false;
    }
  }

  /**
   * Get current authentication token
   * @returns string | null - Current token or null if not available
   */
  getToken(): string | null {
    return getAuthToken();
  }

  /**
   * Set authentication token
   * @param token - Authentication token to set
   */
  setToken(token: string): void {
    setAuthToken(token);
  }

  /**
   * Clear authentication token
   */
  clearToken(): void {
    try {
      removeAuthToken();

    } catch (error) {

    }
  }

  /**
   * Check if current token is valid (basic validation)
   * @returns boolean - true if token appears valid
   */
  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // Basic validation - check if it's a JWT token or reasonable length
    if (token.startsWith('ey') && token.includes('.')) {
      try {
        // Parse JWT payload to check expiration
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const currentTime = Math.floor(Date.now() / 1000);

          // Check if token is expired (with 1 minute buffer)
          if (payload.exp && payload.exp < (currentTime - 60)) {
            return false;
          }
        }
        return true;
      } catch (error) {
        return false;
      }
    }

    // For other token formats, check reasonable length
    return token.length >= 10;
  }

  /**
   * Refresh the authentication token
   * @returns Promise<boolean> - true if refresh succeeded
   */
  async refreshAuthToken(): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) return false;

      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.token) {
          this.setToken(result.data.token);
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const tokenManager = new TokenManagerImpl();

// Export convenience functions for direct usage
export const ensureAuthToken = (currentUser?: any) => tokenManager.ensureToken(currentUser);
export const getAuthTokenSafe = () => tokenManager.getToken();
export const setAuthTokenSafe = (token: string) => tokenManager.setToken(token);
export const clearAuthToken = () => tokenManager.clearToken();
export const isAuthTokenValid = () => tokenManager.isTokenValid();
export const refreshAuthToken = () => tokenManager.refreshAuthToken();
