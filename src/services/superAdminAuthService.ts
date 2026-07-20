import { API_CONFIG } from '../config/api';

const SUPER_ADMIN_TOKEN_KEY = 'super_admin_token';
const SUPER_ADMIN_USER_KEY = 'super_admin_user';

export interface SuperAdminUser {
  token: string;
  username: string;
  first_name: string;
  last_name: string;
}

export class SuperAdminAuthService {
  private static instance: SuperAdminAuthService;

  private constructor() {}

  public static getInstance(): SuperAdminAuthService {
    if (!SuperAdminAuthService.instance) {
      SuperAdminAuthService.instance = new SuperAdminAuthService();
    }
    return SuperAdminAuthService.instance;
  }

  public async login(username: string, password: string): Promise<SuperAdminUser | null> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SUPER_ADMIN.LOGIN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) return null;

      const result = await response.json();
      if (!result.success || !result.data) return null;

      const user = result.data as SuperAdminUser;
      this.setAuthData(user);
      return user;
    } catch {
      return null;
    }
  }

  public logout(): void {
    localStorage.removeItem(SUPER_ADMIN_TOKEN_KEY);
    localStorage.removeItem(SUPER_ADMIN_USER_KEY);
  }

  public getCurrentUser(): SuperAdminUser | null {
    try {
      const userStr = localStorage.getItem(SUPER_ADMIN_USER_KEY);
      const token = localStorage.getItem(SUPER_ADMIN_TOKEN_KEY);
      if (!userStr || !token) return null;
      return JSON.parse(userStr) as SuperAdminUser;
    } catch {
      return null;
    }
  }

  public isAuthenticated(): boolean {
    const token = localStorage.getItem(SUPER_ADMIN_TOKEN_KEY);
    const user = localStorage.getItem(SUPER_ADMIN_USER_KEY);
    if (!token || !user) return false;

    // Validate JWT expiry client-side
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        // Token expired — clear storage
        this.logout();
        return false;
      }
    } catch {
      // Malformed token — treat as unauthenticated
      this.logout();
      return false;
    }

    return true;
  }

  public getAuthHeader(): { Authorization?: string } {
    const token = localStorage.getItem(SUPER_ADMIN_TOKEN_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private setAuthData(user: SuperAdminUser): void {
    localStorage.setItem(SUPER_ADMIN_TOKEN_KEY, user.token);
    localStorage.setItem(SUPER_ADMIN_USER_KEY, JSON.stringify(user));
  }
}

export const superAdminAuth = SuperAdminAuthService.getInstance();
