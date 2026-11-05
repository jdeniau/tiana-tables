const REPOSITORY = 'https://github.com/jdeniau/tiana-tables';

/** The files a release carries, one per installer the makers of `forge.config.ts` build. */
// not an enum: Node loads this file with the Vite config, and only strips types
export const PackageKind = {
  Deb: 'deb',
  Rpm: 'rpm',
  MacArm: 'macArm',
  MacIntel: 'macIntel',
  WindowsSetup: 'windowsSetup',
} as const;
export type PackageKind = (typeof PackageKind)[keyof typeof PackageKind];

/** A file of the release, as GitHub serves it. */
export interface ReleaseFile {
  readonly name: string;
  readonly url: string;
}

/** The latest release, read from GitHub at build. */
export interface Release {
  /** The tag without its `v`: `1.24.0` */
  readonly version: string;
  readonly files: Record<PackageKind, ReleaseFile>;
}

export const repositoryUrl = REPOSITORY;
