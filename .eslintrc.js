module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'prettier',
    'prettier/@typescript-eslint',
  ],
  //   globals: {
  //     Atomics: 'readonly',
  //     SharedArrayBuffer: 'readonly',
  //   },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2018,
    sourceType: 'module',
    project: './tsconfig.eslint.json',
    tsconfigRootDir: './',
  },
  settings: {
    react: {
      version: 'detect',
      linkComponents: [
        // Components used as alternatives to <a> for linking, eg. <Link to={ url } />
        { name: 'Link', linkAttribute: 'to' },
        { name: 'NavLink', linkAttribute: 'to' },
      ],
    },
  },
  plugins: ['react', '@typescript-eslint', 'react-hooks'],
  rules: {
    '@typescript-eslint/prefer-regexp-exec': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: false,
      },
    ],
    '@typescript-eslint/unbound-method': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
