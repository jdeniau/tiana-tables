import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
// import { MakerDMG } from '@electron-forge/maker-dmg';
import { VitePlugin } from '@electron-forge/plugin-vite';
import invariant from 'tiny-invariant';

const config: ForgeConfig = {
  packagerConfig: {
    executableName: 'tiana-tables',
    osxSign: {
      identity:
        process.env.APPLE_SIGN_ID ||
        invariant(
          process.env.APPLE_SIGN_ID,
          '"APPLE_SIGN_ID" environment variable is required'
        ) ||
        '', // TODO :Do we need to pass this ? It "should" be handled automatically by osx-sign
      // provisioningProfile: 'path/to/provisioningProfile', probably need that on CI
    }, // object must exist even if empty
    osxNotarize: {
      // option 1
      appleId:
        // weird syntax if to throw an error if not defined only when trying to sign & notarize
        process.env.APPLE_ID ||
        invariant(
          process.env.APPLE_ID,
          '"APPLE_ID" environment variable is required'
        ) ||
        '',
      appleIdPassword:
        process.env.APPLE_APP_PASSWORD ||
        invariant(
          process.env.APPLE_APP_PASSWORD,
          '"APPLE_APP_PASSWORD" environment variable is required'
        ) ||
        '',
      teamId:
        process.env.APPLE_TEAM_ID ||
        invariant(
          process.env.APPLE_TEAM_ID,
          '"APPLE_TEAM_ID" environment variable is required'
        ) ||
        '',
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
    // new MakerDMG({}),
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'jdeniau',
          name: 'tiana-tables',
        },
        prerelease: true,
        draft: true,
      },
    },
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
  ],
};

export default config;
