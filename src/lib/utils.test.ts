import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('combines class names', () => {
    const result = cn('class1', 'class2');
    expect(result).toContain('class1');
    expect(result).toContain('class2');
  });

  it('handles conditional classes', () => {
    const result = cn('base', true && 'active', false && 'inactive');
    expect(result).toContain('base');
    expect(result).toContain('active');
    expect(result).not.toContain('inactive');
  });

  it('handles undefined and null', () => {
    const result = cn('base', undefined, null);
    expect(result).toContain('base');
  });

  it('handles empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles single class', () => {
    const result = cn('only-class');
    expect(result).toBe('only-class');
  });
});
