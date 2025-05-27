import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    workspace: ['src/*'],
    coverage: {
      provider: 'v8'
    }
  },
  define: {
    'import.meta.vitest': 'undefined',
  },
});
