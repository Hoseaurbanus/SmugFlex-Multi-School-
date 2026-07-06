import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DataCache, { cacheKeys, batchCache } from './dataCache';

describe('DataCache', () => {
  let cache: DataCache;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new DataCache({ ttl: 1000, maxSize: 3 });
  });

  afterEach(() => {
    cache.destroy();
    vi.useRealTimers();
  });

  describe('set and get', () => {
    it('stores and retrieves data', () => {
      cache.set('key1', { name: 'test' });
      expect(cache.get('key1')).toEqual({ name: 'test' });
    });

    it('returns null for non-existent key', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('overwrites existing key', () => {
      cache.set('key1', 'first');
      cache.set('key1', 'second');
      expect(cache.get('key1')).toBe('second');
    });
  });

  describe('expiration', () => {
    it('returns null after TTL expires', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      vi.advanceTimersByTime(1001);
      expect(cache.get('key1')).toBeNull();
    });

    it('respects custom TTL per entry', () => {
      cache.set('short', 'value', 500);
      cache.set('long', 'value', 2000);

      vi.advanceTimersByTime(501);
      expect(cache.get('short')).toBeNull();
      expect(cache.get('long')).toBe('value');
    });
  });

  describe('max size', () => {
    it('evicts oldest entry when cache is full', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4);

      expect(cache.get('a')).toBeNull();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('d')).toBe(4);
    });
  });

  describe('has', () => {
    it('returns true for existing key', () => {
      cache.set('key1', 'value');
      expect(cache.has('key1')).toBe(true);
    });

    it('returns false for non-existent key', () => {
      expect(cache.has('key1')).toBe(false);
    });

    it('returns false for expired key', () => {
      cache.set('key1', 'value');
      vi.advanceTimersByTime(1001);
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('delete', () => {
    it('removes entry and returns true', () => {
      cache.set('key1', 'value');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeNull();
    });

    it('returns false for non-existent key', () => {
      expect(cache.delete('key1')).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();
      expect(cache.get('a')).toBeNull();
      expect(cache.get('b')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('returns correct stats', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
      expect(stats.entries).toHaveLength(2);
    });
  });
});

describe('cacheKeys', () => {
  it('generates correct keys', () => {
    expect(cacheKeys.teacher(1)).toBe('teacher_1');
    expect(cacheKeys.students(5)).toBe('students_class_5');
    expect(cacheKeys.attendance(3, 'Term 1')).toBe('attendance_3_Term 1');
    expect(cacheKeys.classes()).toBe('classes_all');
    expect(cacheKeys.classes('level=JSS')).toBe('classes_level=JSS');
  });
});

describe('batchCache', () => {
  let cache: DataCache;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new DataCache({ ttl: 5000 });
  });

  afterEach(() => {
    cache.destroy();
    vi.useRealTimers();
  });

  it('gets multiple keys at once', () => {
    cache.set('a', 1);
    cache.set('c', 3);
    const result = batchCache.get<number>(['a', 'b', 'c'], cache);
    expect(result.get('a')).toBe(1);
    expect(result.get('b')).toBeNull();
    expect(result.get('c')).toBe(3);
  });

  it('sets multiple entries at once', () => {
    batchCache.set(
      [
        { key: 'a', data: 1 },
        { key: 'b', data: 2 },
      ],
      cache
    );
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
  });

  it('deletes multiple keys and returns count', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    const deleted = batchCache.delete(['a', 'c'], cache);
    expect(deleted).toBe(2);
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBeNull();
  });
});
