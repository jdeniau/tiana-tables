/**
 * How the running application was installed. This decides what we can honestly
 * tell the user when a new version exists: telling someone to download a
 * package when their store already updates them is worse than saying nothing.
 */
export type InstallSourceKind =
  /** A store handles updates for us: say nothing, or nearly. */
  | 'flatpak'
  | 'snap'
  /** A single file the user downloaded: they have to download the new one. */
  | 'appimage'
  /** Installed under a system prefix, so it came from dpkg/rpm. */
  | 'linuxPackage'
  /** Windows/macOS: Squirrel should have updated us, so this is a symptom. */
  | 'selfUpdating'
  | 'unknown';

type DetectionInput = {
  platform: NodeJS.Platform;
  execPath: string;
  env: NodeJS.ProcessEnv;
};

/**
 * Pure, so it can be exercised for every packaging without touching the real
 * process. Ordered from the most reliable signal to the least: the three
 * sandboxed formats each export an unambiguous variable, the system prefix is
 * only an inference, and anything left over is `unknown` on purpose — the
 * message attached to it must stay true whatever the real situation is.
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

  // electron-forge's deb/rpm makers install under /usr/lib/<name>. Nothing but
  // a package manager writes there, so the reverse inference is safe. A build
  // unpacked by hand lives in the user's home and stays `unknown`.
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
