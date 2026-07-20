import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tokenManager } from './tokenManager';
import { getAuthToken, setAuthToken, removeAuthToken } from '../config/api';

vi.mock('../config/api', () => ({
  getAuthToken: vi.fn(),
  setAuthToken: vi.fn(),
  removeAuthToken: vi.fn(),
  API_CONFIG: {
    AUTH: {
      TOKEN_KEY: 'jwt_token',
      REFRESH_TOKEN_KEY: 'refresh_token',
      USER_KEY: 'current_user',
    },
    BASE_URL: 'http://localhost:3000/api',
  },
}));

function makeJwt(payload: Record<string, any>): string {
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }));
  const body = btoa(JSON.stringify(payload));
  const sig = btoa('fake-signature');
  return `${header}.${body}.${sig}`;
}

describe('tokenManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('getToken', () => {
    it('returns token from getAuthToken', () => {
      vi.mocked(getAuthToken).mockReturnValue('test-token');
      expect(tokenManager.getToken()).toBe('test-token');
    });

    it('returns null when no token', () => {
      vi.mocked(getAuthToken).mockReturnValue(null);
      expect(tokenManager.getToken()).toBeNull();
    });
  });

  describe('setToken', () => {
    it('calls setAuthToken with the token', () => {
      tokenManager.setToken('new-token');
      expect(setAuthToken).toHaveBeenCalledWith('new-token');
    });
  });

  describe('clearToken', () => {
    it('calls removeAuthToken', () => {
      tokenManager.clearToken();
      expect(removeAuthToken).toHaveBeenCalled();
    });
  });

  describe('isTokenValid', () => {
    it('returns false when no token', () => {
      vi.mocked(getAuthToken).mockReturnValue(null);
      expect(tokenManager.isTokenValid()).toBe(false);
    });

    it('returns false for non-JWT token', () => {
      vi.mocked(getAuthToken).mockReturnValue('not-a-jwt-token');
      expect(tokenManager.isTokenValid()).toBe(false);
    });

    it('returns false for short token', () => {
      vi.mocked(getAuthToken).mockReturnValue('abc');
      expect(tokenManager.isTokenValid()).toBe(false);
    });

    it('returns true for valid non-expired JWT', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const token = makeJwt({ exp: futureExp });
      vi.mocked(getAuthToken).mockReturnValue(token);
      expect(tokenManager.isTokenValid()).toBe(true);
    });

    it('returns false for expired JWT', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 7200;
      const token = makeJwt({ exp: pastExp });
      vi.mocked(getAuthToken).mockReturnValue(token);
      expect(tokenManager.isTokenValid()).toBe(false);
    });

    it('returns true for JWT expiring within 1 minute buffer', () => {
      const nearFuture = Math.floor(Date.now() / 1000) + 30;
      const token = makeJwt({ exp: nearFuture });
      vi.mocked(getAuthToken).mockReturnValue(token);
      expect(tokenManager.isTokenValid()).toBe(true);
    });

    it('returns false for JWT with malformed payload', () => {
      const token = 'ey.JhbGci.123';
      vi.mocked(getAuthToken).mockReturnValue(token);
      expect(tokenManager.isTokenValid()).toBe(false);
    });
  });

  describe('ensureToken', () => {
    it('returns true when valid token already exists', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const token = makeJwt({ exp: futureExp });
      vi.mocked(getAuthToken).mockReturnValue(token);
      const result = await tokenManager.ensureToken();
      expect(result).toBe(true);
    });

    it('returns false when no token anywhere', async () => {
      vi.mocked(getAuthToken).mockReturnValue(null);
      const result = await tokenManager.ensureToken();
      expect(result).toBe(false);
    });

    it('sets token from currentUser if provided', async () => {
      vi.mocked(getAuthToken).mockReturnValueOnce(null).mockReturnValueOnce('valid-jwt');
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const token = makeJwt({ exp: futureExp });

      const _result = await tokenManager.ensureToken({ token });
      expect(setAuthToken).toHaveBeenCalledWith(token);
    });

    it('clears corrupted localStorage data', async () => {
      vi.mocked(getAuthToken).mockReturnValue(null);
      localStorage.setItem('current_user', 'not-valid-json{{{');

      const result = await tokenManager.ensureToken();
      expect(result).toBe(false);
      expect(localStorage.getItem('current_user')).toBeNull();
    });
  });

  describe('refreshAuthToken', () => {
    it('returns false when no token', async () => {
      vi.mocked(getAuthToken).mockReturnValue(null);
      const result = await tokenManager.refreshAuthToken();
      expect(result).toBe(false);
    });

    it('returns true on successful refresh', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const oldToken = makeJwt({ exp: futureExp });
      const newToken = makeJwt({ exp: futureExp + 3600 });
      vi.mocked(getAuthToken).mockReturnValue(oldToken);

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { token: newToken } }),
      });

      const result = await tokenManager.refreshAuthToken();
      expect(result).toBe(true);
      expect(setAuthToken).toHaveBeenCalledWith(newToken);
    });

    it('returns false on failed refresh', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const token = makeJwt({ exp: futureExp });
      vi.mocked(getAuthToken).mockReturnValue(token);

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ success: false }),
      });

      const result = await tokenManager.refreshAuthToken();
      expect(result).toBe(false);
    });

    it('returns false on network error', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const token = makeJwt({ exp: futureExp });
      vi.mocked(getAuthToken).mockReturnValue(token);

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await tokenManager.refreshAuthToken();
      expect(result).toBe(false);
    });
  });
});
