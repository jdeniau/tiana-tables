import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import { flatConfigs as importConfigs } from 'eslint-plugin-import-x';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import { configs as storybookConfigs } from 'eslint-plugin-storybook';
import globals from 'globals';
import reactPackage from 'react/package.json' with { type: 'json' };
import { configs as tsConfigs } from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'forge.config.ts',
      'vite.*.config.*',
      'vitest.config.*',
      'out/',
      '.vite/',
    ],
  },
  js.configs.recommended,
  tsConfigs.recommended,
  importConfigs.recommended,
  importConfigs.electron,
  importConfigs.typescript,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  reactHooks.configs.flat['recommended-latest'],
  storybookConfigs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    settings: {
      react: {
        // `detect` calls `context.getFilename`, which ESLint 10 removed
        version: reactPackage.version,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_' },
      ],
      'sort-imports': ['error', { ignoreDeclarationSort: true }],
      'import-x/order': [
        'error',
        {
          alphabetize: { order: 'asc' },
          pathGroups: [
            {
              pattern: 'react',
              group: 'external',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['react'],
        },
      ],
    },
  }
);
