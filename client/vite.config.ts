import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'pdf-form-editor-shared': path.resolve(__dirname, '../shared/types.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3002',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    alias: {
      'pdf-form-editor-shared': path.resolve(__dirname, '../shared/types.ts'),
    },
  },
});
