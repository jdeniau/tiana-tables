import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // ... Specify options here.
    exclude: [...configDefaults.exclude, 'out/**'],
  },
});
