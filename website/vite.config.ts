import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { vitePrerenderPlugin } from 'vite-prerender-plugin';
import { fetchLatestRelease } from './src/latestRelease.ts';

export default defineConfig(async () => ({
  plugins: [react(), vitePrerenderPlugin({ renderTarget: '#root' })],
  // the download links name the files of the latest release, read once at build
  define: {
    __RELEASE__: JSON.stringify(
      await fetchLatestRelease(process.env.GITHUB_TOKEN)
    ),
  },
  // website/package.json makes Vite stop here: the fonts live in the repository's node_modules
  server: { fs: { allow: [resolve(import.meta.dirname, '..')] } },
}));
