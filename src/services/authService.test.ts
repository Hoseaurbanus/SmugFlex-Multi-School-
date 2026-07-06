import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './authService';
import { getAuthToken, setAuthToken, removeAuthToken, getCurrentUser, setCurrentUser } from '../config/api';

vi.mock('../config/api', () => ({
  getAuthToken: vi.fn(),
  setAuthToken: vi.fn(),
  removeAuthToken: vi.fn(),
  getCurrentUser: vi.fn(),
  setCurrentUser: vi.fn(),
  API_CONFIG: {
    BASE_URL: 'http://localhost:3000/api',
    ENDPOINTS: {
      AUTH: {
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        REFRESH_TOKEN: '/auth/refresh-token',
      },
    },
  },
}));

function makeJwt(payload: Record<string, any>): string {
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }));
  const body = btoa(JSON.stringify(payload));
  const sig = btoa('fake-signature');
  return `${header}.${body}.${sig}`;
}

describe('AuthService', () => {
  const service = AuthService.getInstance();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('validateToken', () => {
    it('returns false for empty token', () => {
      expect(service.validateToken('')).toBe(false);
    });

    it('returns false for non-JWT token', () => {
      expect(service.validateToken('not-a-jwt')).toBe(false);
    });

    it('returns false for malformed JWT', () => {
      expect(service.validateToken('a.b')).toBe(false);
    });

    it('returns true for valid non-expired JWT', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const token = makeJwt({ exp: futureExp });
      expect(service.validateToken(token)).toBe(true);
    });

    it('returns false for expired JWT', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 7200;
      const token = makeJwt({ exp: pastExp });
      expect(service.validateToken(token)).toBe(false);
    });

    it('returns false for unparseable JWT', () => {
      expect(service.validateToken('ey.abc.def')).toBe(false);
    });
  });

  describe('getTokenExpiration', () => {
    it('returns Date for valid JWT with exp', () => {
      const exp = 1700000000;
      const token = makeJwt({ exp });
      const result = service.getTokenExpiration(token);
      expect(result).toEqual(new Date(exp * 1000));
    });

    it('returns null for JWT without exp', () => {
      const token = makeJwt({ user_id: 1 });
      expect(service.getTokenExpiration(token)).toBeNull();
    });

    it('returns null for invalid token', () => {
      expect(service.getTokenExpiration('invalid')).toBeNull();
    });
  });

  describe('hasPermission', () => {
    it('returns false when no user', () => {
      vi.mocked(getCurrentUser).mockReturnValue(null);
      expect(service.hasPermission('manage_students')).toBe(false);
    });

    it('returns true when user has permission', () => {
      vi.mocked(getAuthToken).mockReturnValue('valid-token');
      vi.mocked(getCurrentUser).mockReturnValue({
        permissions: ['manage_students', 'manage_teachers'],
      } as any);
      expect(service.hasPermission('manage_students')).toBe(true);
    });

    it('returns false when user lacks permission', () => {
      vi.mocked(getCurrentUser).mockReturnValue({
        permissions: ['manage_teachers'],
      } as any);
      expect(service.hasPermission('manage_students')).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('returns false when no user', () => {
      vi.mocked(getCurrentUser).mockReturnValue(null);
      expect(service.hasRole('admin')).toBe(false);
    });

    it('returns true when role matches', () => {
      vi.mocked(getAuthToken).mockReturnValue('valid-token');
      vi.mocked(getCurrentUser).mockReturnValue({ role: 'admin' } as any);
      expect(service.hasRole('admin')).toBe(true);
    });

    it('returns false when role does not match', () => {
      vi.mocked(getCurrentUser).mockReturnValue({ role: 'teacher' } as any);
      expect(service.hasRole('admin')).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('returns false when no token', () => {
      vi.mocked(getAuthToken).mockReturnValue(null);
      vi.mocked(getCurrentUser).mockReturnValue(null);
      expect(service.isAuthenticated()).toBe(false);
    });

    it('returns false when no user', () => {
      vi.mocked(getAuthToken).mockReturnValue('token');
      vi.mocked(getCurrentUser).mockReturnValue(null);
      expect(service.isAuthenticated()).toBe(false);
    });

    it('returns true when token and user exist', () => {
      vi.mocked(getAuthToken).mockReturnValue('token');
      vi.mocked(getCurrentUser).mockReturnValue({ id: 1 } as any);
      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe('getAuthHeader', () => {
    it('returns empty object when no token', () => {
      vi.mocked(getAuthToken).mockReturnValue(null);
      expect(service.getAuthHeader()).toEqual({});
    });

    it('returns Authorization header when token exists', () => {
      vi.mocked(getAuthToken).mockReturnValue('test-token');
      expect(service.getAuthHeader()).toEqual({ Authorization: 'Bearer test-token' });
    });
  });
});
