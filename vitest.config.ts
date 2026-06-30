import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    coverage: {
      provider: 'v8',
      enabled: false,
      reporter: ['text', 'text-summary', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/shared/**/*.ts', 'electron/**/*.ts'],
      exclude: [
        '**/*.d.ts',
        '**/__tests__/**',
        'electron/main.ts',
        'electron/preload.ts',
        'electron/logger/**',
        'src/**/index.ts',
        'src/shared/fixtures/**',
      ],
      thresholds: {
        lines: 60,
        statements: 60,
        functions: 65,
        branches: 65,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
