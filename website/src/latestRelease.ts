import { z } from 'zod';
import { PackageKind, type Release, type ReleaseFile } from './release.ts';

const LATEST_RELEASE_URL =
  'https://api.github.com/repos/jdeniau/tiana-tables/releases/latest';

/** Each package's file, told by the end of its name: the version sits in the middle. */
const FILE_PATTERNS: Record<PackageKind, RegExp> = {
  [PackageKind.Deb]: /_amd64\.deb$/,
  [PackageKind.Rpm]: /\.x86_64\.rpm$/,
  [PackageKind.MacArm]: /-darwin-arm64-.*\.zip$/,
  [PackageKind.MacIntel]: /-darwin-x64-.*\.zip$/,
  [PackageKind.WindowsSetup]: /\.Setup\.exe$/,
};

const githubRelease = z.object({
  tag_name: z.string(),
  assets: z.array(
    z.object({ name: z.string(), browser_download_url: z.url() })
  ),
});

/** The release GitHub answered, with one file per package: throws when one is missing. */
export function toRelease(answer: unknown): Release {
  const { tag_name: tag, assets } = githubRelease.parse(answer);

  const fileOf = (kind: PackageKind): ReleaseFile => {
    const asset = assets.find(({ name }) => FILE_PATTERNS[kind].test(name));
    if (!asset) {
      throw new Error(`The release ${tag} has no ${kind} file`);
    }
    return { name: asset.name, url: asset.browser_download_url };
  };

  return {
    version: tag.replace(/^v/, ''),
    files: {
      [PackageKind.Deb]: fileOf(PackageKind.Deb),
      [PackageKind.Rpm]: fileOf(PackageKind.Rpm),
      [PackageKind.MacArm]: fileOf(PackageKind.MacArm),
      [PackageKind.MacIntel]: fileOf(PackageKind.MacIntel),
      [PackageKind.WindowsSetup]: fileOf(PackageKind.WindowsSetup),
    },
  };
}

/** The latest published release; a token lifts GitHub's limit of 60 calls an hour. */
export async function fetchLatestRelease(
  token: string | undefined
): Promise<Release> {
  const response = await fetch(LATEST_RELEASE_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(
      `GitHub answered ${response.status} for the latest release`
    );
  }
  return toRelease(await response.json());
}
