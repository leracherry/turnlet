import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/turnlet/tests/**/*.test.ts',
      'apps/demo/src/**/*.test.ts',
    ],
  },
});
