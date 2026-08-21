import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 40_000,
    // RLS tests hit a real local Postgres; keep them serial.
    fileParallelism: false,
  },
});
