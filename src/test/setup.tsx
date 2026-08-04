import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// ── Browser API mocks ──────────────────────────────────────────────
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

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: class { observe() {} unobserve() {} disconnect() {} },
});

Object.defineProperty(globalThis, 'scrollTo', {
  writable: true,
  value: () => {},
});

// ── Heavy library mocks (prevent slow imports in tests) ────────────
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => {
      const Component = ({ children, ...props }: Record<string, unknown>) => {
        const { key: _k, initial: _i, animate: _a, exit: _e, transition: _t, whileHover: _wh, whileTap: _wt, variants: _v, layout: _l, ...rest } = props as Record<string, unknown>;
        return <div {...rest}>{children as React.ReactNode}</div>;
      };
      Component.displayName = `motion.${String(prop)}`;
      return Component;
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAnimation: () => ({ start: () => {}, stop: () => {}, set: () => {} }),
  useMotionValue: () => ({ set: () => {}, get: () => 0 }),
  useTransform: () => 0,
  useSpring: () => ({ set: () => {}, get: () => 0 }),
}));

vi.mock('motion/react', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => {
      const Component = ({ children, ...props }: Record<string, unknown>) => {
        const { key: _k, initial: _i, animate: _a, exit: _e, transition: _t, whileHover: _wh, whileTap: _wt, variants: _v, layout: _l, ...rest } = props as Record<string, unknown>;
        return <div {...rest}>{children as React.ReactNode}</div>;
      };
      Component.displayName = `motion.${String(prop)}`;
      return Component;
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAnimation: () => ({ start: () => {}, stop: () => {}, set: () => {} }),
  useMotionValue: () => ({ set: () => {}, get: () => 0 }),
  useTransform: () => 0,
  useSpring: () => ({ set: () => {}, get: () => 0 }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
}));

vi.mock('jspdf', () => {
  return {
    default: class MockJsPDF {
      text() { return this; }
      setFontSize() { return this; }
      setFont() { return this; }
      splitTextToSize(t: string) { return [t]; }
      save() {}
      output() { return ''; }
      internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    },
    jsPDF: class MockJsPDF {
      text() { return this; }
      setFontSize() { return this; }
      setFont() { return this; }
      splitTextToSize(t: string) { return [t]; }
      save() {}
      output() { return ''; }
      internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    },
  };
});

vi.mock('jspdf-autotable', () => ({ default: () => ({}) }));

vi.mock('html2canvas', () => ({ default: () => Promise.resolve(document.createElement('canvas')) }));

vi.mock('mammoth', () => ({ default: { convertToHtml: () => Promise.resolve({ value: '' }) } }));

vi.mock('jszip', () => ({ default: class { file() { return this; } generateAsync() { return Promise.resolve(new Blob()); } } }));

vi.mock('fast-xml-parser', () => ({ XMLParser: class { parse() { return {}; } } }));

vi.mock('canvas', () => ({}));

vi.mock('sonner', async () => {
  const actual = await vi.importActual<typeof import('sonner')>('sonner');
  return {
    ...actual,
    toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
  };
});
