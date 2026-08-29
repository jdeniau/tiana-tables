/** How the application was installed, which decides what we can tell the user. */
export type InstallSourceKind =
  /** A store already installs updates. */
  | 'flatpak'
  | 'snap'
  | 'appimage'
  /** Under a system prefix, so dpkg/rpm put it there. */
  | 'linuxPackage'
  /** Windows/macOS: Squirrel should have updated us. */
  | 'selfUpdating'
  | 'unknown';

type DetectionInput = {
  platform: NodeJS.Platform;
  execPath: string;
  env: NodeJS.ProcessEnv;
};

/**
 * Signals are ordered by reliability: a Flatpak also has a `/usr`, so the
 * environment variables must win over the prefix. `unknown` is a real case,
 * not a detection failure — its message holds in every situation.
 */
export function detectInstallSource({
  platform,
  execPath,
  env,
}: DetectionInput): InstallSourceKind {
  if (env.FLATPAK_ID) {
    return 'flatpak';
  }

  if (env.SNAP) {
    return 'snap';
  }

  if (env.APPIMAGE) {
    return 'appimage';
  }

  if (platform === 'win32' || platform === 'darwin') {
    return 'selfUpdating';
  }

  if (platform !== 'linux') {
    return 'unknown';
  }

  // electron-forge's deb/rpm makers install under /usr/lib/<name>, and nothing
  // but a package manager writes there
  if (execPath.startsWith('/usr/') || execPath.startsWith('/opt/')) {
    return 'linuxPackage';
  }

  return 'unknown';
}

export function getInstallSource(): InstallSourceKind {
  return detectInstallSource({
    platform: process.platform,
    execPath: process.execPath,
    env: process.env,
  });
}
