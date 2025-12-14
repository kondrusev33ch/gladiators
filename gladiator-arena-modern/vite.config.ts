import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@core': resolve(__dirname, './src/core'),
      '@systems': resolve(__dirname, './src/systems'),
      '@types': resolve(__dirname, './src/types'),
      '@utils': resolve(__dirname, './src/utils'),
      '@data': resolve(__dirname, './src/data'),
      '@arena': resolve(__dirname, './arena'),
    },
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: true,
  },
  server: {
    port: 3000,
    open: true,
  },
});
