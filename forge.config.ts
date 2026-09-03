import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerFlatpak } from '@electron-forge/maker-flatpak';
import { MakerRpm } from '@electron-forge/maker-rpm';
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
    // Almost every option below exists only to override a default that went
    // stale years ago. This is a known, documented state of the maker, not
    // something wrong with this repository:
    //
    // - https://github.com/electron/forge/issues/4240
    //   The maker is documented as working, but building against any current
    //   freedesktop SDK requires patching unmaintained upstream packages, and
    //   it fails with an opaque `flatpak-builder failed with status code 1`.
    //   The proposal on the issue is to mark it experimental.
    // - https://github.com/malept/electron-installer-flatpak/issues/132
    //   The source of it: `@malept/electron-installer-flatpak` has shipped
    //   nothing since 2021 and pins zypak v2021.02, whose Makefile hardcodes
    //   `CXX := clang++` — the SDK only ships g++. Upstream zypak fixed that
    //   long ago (v2025.09 uses g++), but the pin never moved.
    //
    // Two things to know before touching this:
    // - `yarn make --targets flatpak`, never the module name. Forge matches
    //   `--targets` against the maker's `name`, and on a miss it rebuilds the
    //   maker with NO config and silently uses every default below.
    // - `DEBUG='*flatpak*'` prints the generated manifest, the only way to
    //   check that any of this was applied.
    new MakerFlatpak({
      options: {
        // Keyed by resolution, the icon lands in the hicolor theme rather than
        // in the legacy share/pixmaps, which is the only place appstreamcli
        // looks — a string here fails the build with `icon-not-found`. The
        // sizes have to be standard ones; 1024x1024 is not searched.
        icon: {
          '128x128': 'images/icons/icon-128.png',
          '256x256': 'images/icons/icon-256.png',
          '512x512': 'images/icons/icon-512.png',
        },
        // Permanent once published on Flathub, and it has to match the
        // .desktop and the AppStream metainfo.
        id: 'io.github.jdeniau.TianaTables',
        genericName: 'SQL Client',
        categories: ['Development'],
        // `base` is left to the maker, which picks it from the Electron
        // version. These two cannot be: the default runtime is still 19.08,
        // EOL since 2021. Bump them together, they share a branch.
        baseVersion: '25.08',
        runtimeVersion: '25.08',
        // Replaces the maker's list rather than extending it — options are
        // merged with a shallow `_.defaults`. So this is the whole permission
        // set of the app, which is where it should be readable anyway.
        finishArgs: [
          '--socket=wayland',
          '--socket=fallback-x11',
          // X11 shared memory, used by the fallback above
          '--share=ipc',
          '--device=dri',
          '--share=network',
          // safeStorage falls back to `basic_text` — a hardcoded key — when it
          // cannot reach the secret service, so passwords would only be
          // obfuscated without this.
          '--talk-name=org.freedesktop.secrets',
          // Chromium writes its singleton lock and its temporary files under
          // TMPDIR, and the sandbox /tmp is a small private tmpfs.
          '--env=TMPDIR=/var/tmp',
          // No filesystem access on purpose: everything the app writes lives
          // under `app.getPath('userData')`, which the sandbox already owns.
        ],
        // The maker compiles zypak from a 2021 git tag, which needs a clang++
        // the SDK does not ship. Useless anyway: the Electron base app already
        // provides zypak-wrapper, which is what the generated launcher calls.
        modules: [],
        files: [
          [
            'flatpak/io.github.jdeniau.TianaTables.metainfo.xml',
            '/share/metainfo/io.github.jdeniau.TianaTables.metainfo.xml',
          ],
        ],
      },
    }),
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
