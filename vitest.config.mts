import { configDefaults, defineConfig } from 'vitest/config';
import babel from '@rolldown/plugin-babel';
import { reactCompilerPreset } from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

// a plugin upgraded by Yarn changes the transforms with no config option to tell the module cache
const lockfileHash = createHash('sha256')
  .update(readFileSync(path.join(import.meta.dirname, 'yarn.lock')))
  .digest('hex');

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [
    {
      name: 'lockfile-cache-key',
      configureVitest({ defineCacheKeyGenerator }) {
        defineCacheKeyGenerator(() => lockfileHash);
      },
    },
  ],
  test: {
    fsModuleCache: true,
    projects: [
      {
        // the components run as the app compiles them: they leave their memoisation to React Compiler
        plugins: [babel({ presets: [reactCompilerPreset()] })],
        test: {
          // ... Specify options here.
          exclude: [...configDefaults.exclude, 'out/**'],
          // one worker per core peaked at 6 GiB on 16 cores
          maxWorkers: '50%',
        },
      },
      {
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(import.meta.dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          // after the Node project: run alongside it, the two took 13 GiB
          sequence: { groupOrder: 1 },
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [
              {
                browser: 'chromium',
              },
            ],
          },
        },
      },
    ],
  },
});
