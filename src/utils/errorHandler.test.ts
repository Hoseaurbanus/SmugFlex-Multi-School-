import { describe, it, expect } from 'vitest';
import {
  getUserFriendlyError,
  getErrorSeverity,
  formatErrorForDisplay,
  isRecoverableError,
  getRetryDelay,
} from './errorHandler';

describe('getUserFriendlyError', () => {
  it('returns mapped error for known messages', () => {
    const result = getUserFriendlyError('Failed to fetch');
    expect(result.userMessage).toContain('Unable to connect');
    expect(result.severity).toBe('high');
  });

  it('handles Error objects', () => {
    const result = getUserFriendlyError(new Error('Unauthorized'));
    expect(result.userMessage).toContain('session has expired');
  });

  it('returns partial match for contained errors', () => {
    const result = getUserFriendlyError('Something NetworkError happened');
    expect(result.userMessage).toContain('Network connection lost');
  });

  it('handles 401 in error message', () => {
    const result = getUserFriendlyError('Error 401 occurred');
    expect(result.userMessage).toContain('session has expired');
  });

  it('handles 403 in error message', () => {
    const result = getUserFriendlyError('Error 403 forbidden');
    expect(result.userMessage).toContain('permission');
  });

  it('handles 404 in error message', () => {
    const result = getUserFriendlyError('Error 404 not found');
    expect(result.userMessage).toContain('could not be found');
  });

  it('handles 500 in error message', () => {
    const result = getUserFriendlyError('Error 500 server error');
    expect(result.userMessage).toContain('Something went wrong');
  });

  it('handles timeout in error message', () => {
    const result = getUserFriendlyError('Request timeout');
    expect(result.userMessage).toContain('timed out');
  });

  it('returns fallback for unknown errors', () => {
    const result = getUserFriendlyError('Something completely unknown');
    expect(result.userMessage).toContain('unexpected error');
    expect(result.severity).toBe('medium');
  });
});

describe('getErrorSeverity', () => {
  it('returns correct severity for known errors', () => {
    expect(getErrorSeverity('Failed to fetch')).toBe('high');
    expect(getErrorSeverity('Unauthorized')).toBe('high');
    expect(getErrorSeverity('Validation failed')).toBe('medium');
    expect(getErrorSeverity('Assignment deadline passed')).toBe('low');
  });
});

describe('formatErrorForDisplay', () => {
  it('returns formatted error with title', () => {
    const result = formatErrorForDisplay('Failed to fetch');
    expect(result.title).toBe('Error');
    expect(result.userMessage).toBeTruthy();
    expect(result.showRetry).toBe(false);
  });

  it('enables retry for low/medium severity', () => {
    const result = formatErrorForDisplay('Validation failed');
    expect(result.showRetry).toBe(true);
  });

  it('disables retry for high severity', () => {
    const result = formatErrorForDisplay('Internal server error');
    expect(result.showRetry).toBe(false);
  });
});

describe('isRecoverableError', () => {
  it('returns true for low severity', () => {
    expect(isRecoverableError('Assignment deadline passed')).toBe(true);
  });

  it('returns true for medium severity', () => {
    expect(isRecoverableError('Validation failed')).toBe(true);
  });

  it('returns false for high severity', () => {
    expect(isRecoverableError('Failed to fetch')).toBe(false);
  });
});

describe('getRetryDelay', () => {
  it('returns base delay for first attempt', () => {
    const delay = getRetryDelay('Failed to fetch', 1);
    expect(delay).toBe(2000);
  });

  it('increases delay with attempt number', () => {
    const delay1 = getRetryDelay('Failed to fetch', 1);
    const delay2 = getRetryDelay('Failed to fetch', 2);
    expect(delay2).toBeGreaterThan(delay1);
  });

  it('caps delay at 5x base', () => {
    const delay5 = getRetryDelay('Failed to fetch', 5);
    const delay10 = getRetryDelay('Failed to fetch', 10);
    expect(delay5).toBe(delay10);
  });

  it('returns lower delay for low severity', () => {
    const lowDelay = getRetryDelay('Assignment deadline passed', 1);
    const highDelay = getRetryDelay('Failed to fetch', 1);
    expect(lowDelay).toBeLessThan(highDelay);
  });
});
