import { describe, expect, test } from 'vitest';
import { detectInstallSource } from './installSource';

const linux = {
  platform: 'linux' as NodeJS.Platform,
  execPath: '/usr/lib/tiana-tables/tiana-tables',
  env: {},
};

describe('detectInstallSource', () => {
  test('a Flatpak build is recognised by its app id', () => {
    expect(
      detectInstallSource({
        ...linux,
        env: { FLATPAK_ID: 'io.github.jdeniau.TianaTables' },
      })
    ).toBe('flatpak');
  });

  test('a Snap build is recognised by its mount point', () => {
    expect(
      detectInstallSource({ ...linux, env: { SNAP: '/snap/tiana-tables/12' } })
    ).toBe('snap');
  });

  test('an AppImage is recognised by its own path variable', () => {
    expect(
      detectInstallSource({
        ...linux,
        execPath: '/tmp/.mount_Tiana1/tiana-tables',
        env: { APPIMAGE: '/home/user/Downloads/TianaTables.AppImage' },
      })
    ).toBe('appimage');
  });

  test('the sandbox wins over the system prefix', () => {
    // A Flatpak runs from /app, but the runtime also has a /usr: without the
    // ordering, a Flatpak build could be mistaken for a dpkg install.
    expect(
      detectInstallSource({
        ...linux,
        execPath: '/usr/bin/tiana-tables',
        env: { FLATPAK_ID: 'io.github.jdeniau.TianaTables' },
      })
    ).toBe('flatpak');
  });

  test('a system prefix means a package manager put it there', () => {
    expect(detectInstallSource(linux)).toBe('linuxPackage');
    expect(
      detectInstallSource({ ...linux, execPath: '/opt/Tiana Tables/tiana-tables' })
    ).toBe('linuxPackage');
  });

  test('a build unpacked by hand stays unknown', () => {
    expect(
      detectInstallSource({
        ...linux,
        execPath: '/home/user/Downloads/tiana-tables-linux-x64/tiana-tables',
      })
    ).toBe('unknown');
  });

  test('Windows and macOS should have updated themselves', () => {
    expect(
      detectInstallSource({
        platform: 'win32',
        execPath: 'C:\\Users\\user\\AppData\\Local\\tiana_tables\\app-1.1.0\\tiana-tables.exe',
        env: {},
      })
    ).toBe('selfUpdating');

    expect(
      detectInstallSource({
        platform: 'darwin',
        execPath: '/Applications/Tiana Tables.app/Contents/MacOS/Tiana Tables',
        env: {},
      })
    ).toBe('selfUpdating');
  });

  test('an unexpected platform never guesses', () => {
    expect(
      detectInstallSource({
        platform: 'freebsd',
        execPath: '/usr/local/bin/tiana-tables',
        env: {},
      })
    ).toBe('unknown');
  });
});
