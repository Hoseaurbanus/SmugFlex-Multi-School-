import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  base: './',
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
        manualChunks: {
          // Split vendor dependencies
          vendor: ['react', 'react-dom'],
          radix: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          charts: ['recharts'],
          utils: ['lucide-react', 'clsx', 'tailwind-merge']
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