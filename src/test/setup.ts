import '@testing-library/jest-dom/vitest';

// Mock browser APIs not available in jsdom
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    store: new Map<string, string>(),
    getItem(key: string) { return this.store.get(key) ?? null; },
    setItem(key: string, value: string) { this.store.set(key, String(value)); },
    removeItem(key: string) { this.store.delete(key); },
    clear() { this.store.clear(); },
    get length() { return this.store.size; },
    key(index: number) { return [...this.store.keys()][index] ?? null; },
  },
});

// Mock matchMedia
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
