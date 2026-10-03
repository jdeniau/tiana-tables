import babel from '@rolldown/plugin-babel';
import { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config
// No `react()`: its Fast Refresh preamble is an inline script, which the CSP set in `src/main.ts` blocks, leaving a blank window.
export default defineConfig({
  plugins: [babel({ presets: [reactCompilerPreset()] })],
});
