import { defineConfig } from 'vitest/config';

// Nguong bao phu theo PLAN.md §3.2: packages nghiem hon apps vi do la phan logic thuan.
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      include: ['packages/*/src/**', 'apps/*/src/**', 'config/src/**'],
      // types.ts chi chua interface nen khong sinh ma chay duoc
      exclude: ['**/*.test.ts', '**/*.bench.ts', '**/index.ts', '**/*.generated.ts', '**/types.ts'],
      thresholds: {
        'packages/**': { branches: 85, functions: 85, lines: 85, statements: 85 },
        'apps/**': { branches: 70, functions: 70, lines: 70, statements: 70 },
        'config/**': { branches: 85, functions: 85, lines: 85, statements: 85 },
      },
    },
  },
});
