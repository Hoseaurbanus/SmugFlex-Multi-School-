/**
 * Token Management Utility
 * Provides centralized authentication token management for all API calls
 */

import { getAuthToken, setAuthToken, removeAuthToken } from '../config/api';

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
        console.log('TokenManager: Setting token from currentUser');
        setAuthToken(currentUser.token);
        token = currentUser.token;
      }
      
      // If still no token, try to get it from localStorage directly
      if (!token) {
        try {
          const storedUser = localStorage.getItem('currentUser');
          if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.token) {
              console.log('TokenManager: Setting token from localStorage');
              setAuthToken(user.token);
              token = user.token;
            }
          }
        } catch (error) {
          console.error('TokenManager: Error parsing stored user:', error);
          // Clear corrupted data
          localStorage.removeItem('currentUser');
        }
      }
      
      const isValid = this.isTokenValid();
      console.log('TokenManager: Token availability:', !!token, 'Valid:', isValid);
      
      return isValid;
    } catch (error) {
      console.error('TokenManager: Error ensuring token:', error);
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
      console.log('TokenManager: Token cleared');
    } catch (error) {
      console.error('TokenManager: Error clearing token:', error);
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
          
          // Check if token is expired (with 1 minute buffer instead of 5 minutes)
          if (payload.exp && payload.exp < (currentTime - 60)) {
            console.log('TokenManager: Token expired');
            this.clearToken();
            return false;
          }
        }
        return true;
      } catch (error) {
        console.error('TokenManager: Error parsing JWT, treating as valid:', error);
        // Don't clear token on parse error, just treat as valid
        return true;
      }
    }
    
    // For other token formats, check reasonable length
    return token.length >= 10;
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
