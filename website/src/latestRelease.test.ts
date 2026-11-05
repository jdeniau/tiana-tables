import { describe, expect, it } from 'vitest';
import { toRelease } from './latestRelease';
import { PackageKind } from './release';

const DOWNLOAD =
  'https://github.com/jdeniau/tiana-tables/releases/download/v1.24.0';

/** The files of v1.24.0 as `releases/latest` listed them, Squirrel's update files included. */
const NAMES = [
  'RELEASES',
  'tiana-tables-1.24.0-1.x86_64.rpm',
  'tiana-tables_1.24.0_amd64.deb',
  'Tiana.Tables-1.24.0.Setup.exe',
  'Tiana.Tables-darwin-arm64-1.24.0.zip',
  'Tiana.Tables-darwin-x64-1.24.0.zip',
  'tiana_tables-1.24.0-full.nupkg',
];

const answer = (names: string[]): unknown => ({
  tag_name: 'v1.24.0',
  assets: names.map((name) => ({
    name,
    browser_download_url: `${DOWNLOAD}/${name}`,
  })),
});

describe('toRelease', () => {
  it('picks the file of each package', () => {
    const release = toRelease(answer(NAMES));

    expect(release.version).toBe('1.24.0');
    expect(
      Object.values(PackageKind).map((kind) => release.files[kind].name)
    ).toEqual([
      'tiana-tables_1.24.0_amd64.deb',
      'tiana-tables-1.24.0-1.x86_64.rpm',
      'Tiana.Tables-darwin-arm64-1.24.0.zip',
      'Tiana.Tables-darwin-x64-1.24.0.zip',
      'Tiana.Tables-1.24.0.Setup.exe',
    ]);
    expect(release.files[PackageKind.Deb].url).toBe(
      `${DOWNLOAD}/tiana-tables_1.24.0_amd64.deb`
    );
  });

  it('throws when a package has no file yet', () => {
    expect(() =>
      toRelease(answer(NAMES.filter((name) => !name.endsWith('.rpm'))))
    ).toThrow('The release v1.24.0 has no rpm file');
  });
});
