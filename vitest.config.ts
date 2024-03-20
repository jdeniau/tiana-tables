import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    // ... Specify options here.
    exclude: [...configDefaults.exclude, 'out/**'],
  },
});
