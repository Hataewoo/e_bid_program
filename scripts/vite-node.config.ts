import { defineConfig } from 'vitest/config';
import path from 'path';

/** Node-only vite config for CLI scripts (no Electron renderer shims). */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
  },
});
