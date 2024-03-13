import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { VitePlugin } from '@electron-forge/plugin-vite';

const APPLE_ID = 'julien.deniau@gmail.com';
const APPLE_APP_PASSWORD = 'roir-sfxy-yngd-npfz';
const APPLE_TEAM_ID = '87S3WW2RFE';
// const SIGN_ID = 'Apple Distribution: mapado (87S3WW2RFE)';
// const SIGN_ID = 'Developer ID Application: mapado (87S3WW2RFE)';
const SIGN_ID = 'Apple Development: Jerry Nieuviarts (KPN448974M)';

const config: ForgeConfig = {
  packagerConfig: {
    executableName: 'tiana-tables',
    osxSign: {
      // identity: 'Developer ID Application: Julien Deniau (87S3WW2RFE)',
      identity: SIGN_ID, // TODO : need to pass this ?
    }, // object must exist even if empty
    osxNotarize: {
      // tool: 'notarytool',
      // option 1
      appleId: APPLE_ID,
      appleIdPassword: APPLE_APP_PASSWORD,
      teamId: APPLE_TEAM_ID,

      // option 2
      // appleApiKey: '/Users/olynk/code/tiana-tables/AuthKey_T97P3Y6MPA.p8',
      // appleApiKeyId: 'T97P3Y6MPA',
      // appleApiIssuer: '69a6de84-04ae-47e3-e053-5b8c7c11a4d1',
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    // new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
    new MakerDMG({}),
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
