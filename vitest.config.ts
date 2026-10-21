import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    globals: false,
    // The installer adds the glance mod with `claude plugin`: tests never run the real one
    env: { BLUEPRINTS_CLAUDE_CLI: '' },
  },
});
