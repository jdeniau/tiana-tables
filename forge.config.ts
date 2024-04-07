import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerSnap } from '@electron-forge/maker-snap';
// import { MakerDMG } from '@electron-forge/maker-dmg';
import { VitePlugin } from '@electron-forge/plugin-vite';
import invariant from 'tiny-invariant';

const isStartScript = process.argv[1].includes('electron-forge-start');
const willSign = !isStartScript;
const isMac = process.platform === 'darwin';

function requireAppleEnvSignString(
  value: string | undefined,
  envVariableName: string
): string {
  if (!isMac) {
    // do not care about thoses values when not signing, as we are not on a mac
    return '';
  }

  if (willSign) {
    invariant(value, `"${envVariableName}" environment variable is required`);
  }

  return (
    value ??
    // do not care about thoses values when not signing, ie. with `yarn start`
    ''
  );
}

const config: ForgeConfig = {
  packagerConfig: {
    executableName: 'tiana-tables',
    icon: 'images/icons/icon',
    osxSign: {
      identity: requireAppleEnvSignString(
        process.env.APPLE_SIGN_ID,
        'APPLE_SIGN_ID'
      ), // TODO :Do we need to pass this ? It "should" be handled automatically by osx-sign
      // provisioningProfile: 'path/to/provisioningProfile', probably need that on CI
    }, // object must exist even if empty
    osxNotarize: {
      // option 1
      appleId: requireAppleEnvSignString(process.env.APPLE_ID, 'APPLE_ID'),
      appleIdPassword: requireAppleEnvSignString(
        process.env.APPLE_APP_PASSWORD,
        'APPLE_APP_PASSWORD'
      ),
      teamId: requireAppleEnvSignString(
        process.env.APPLE_TEAM_ID,
        'APPLE_TEAM_ID'
      ),
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      setupIcon: 'images/icons/icon.ico',
    }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({
      options: {
        icon: 'images/icons/icon.png',
      },
    }),
    new MakerDeb({
      options: {
        icon: 'images/icons/icon.png',
      },
    }),
    // new MakerDMG({}),
    new MakerSnap({
      config: {
        features: {
          audio: true,
          mpris: 'me.deniau.tiana-tables',
          webgl: true,
        },
        summary: 'Tiana Tables: A SQL client for developers',
      },
    }),
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
    {
      name: '@electron-forge/publisher-snapcraft',
      config: {
        release: '[latest/edge, insider/stable]',
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
