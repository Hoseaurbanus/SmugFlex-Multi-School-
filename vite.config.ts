import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },
  build: {
    target: 'es2015', // More compatible target
    outDir: 'build',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash].[ext]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        format: 'es', // Ensure ES modules
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          const parts = id.split('node_modules/')[1].split('/');
          const pkg = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];

          if (pkg === 'react' || pkg === 'react-dom') return 'react-vendor';
          if (pkg.startsWith('@radix-ui')) return 'radix-ui';
          if (pkg === 'recharts') return 'recharts';
          if (pkg === 'jspdf') return 'jspdf';
          if (pkg === 'html2canvas') return 'html2canvas';
          if (pkg === 'mammoth') return 'mammoth';
          if (pkg === 'jszip') return 'jszip';
          if (pkg === 'clsx' || pkg === 'tailwind-merge' || pkg === 'lucide-react') return 'ui-utils';
          return `vendor-${pkg.replace('@', '').replace('/', '-')}`;
        }
      }
    },
    sourcemap: false,
    minify: 'esbuild',
    // Optimize bundle size
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096
  },
  server: {
    port: 3000,
    host: true,
  },
  cacheDir: '.vite',
  // Enable build optimizations
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react']
  }
});