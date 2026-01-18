import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      '.worktrees/**',  // Exclude nested worktrees to prevent test pollution
      '.cursor/**',     // Exclude cursor IDE artifact worktrees
    ],
  },
});
