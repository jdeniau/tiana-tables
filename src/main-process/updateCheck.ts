import { app, net } from 'electron';
import { compareVersions, validate } from 'compare-versions';
import log from 'electron-log';
import packageJson from '../../package.json';
import { UPDATE_CHANNEL } from '../preload/updateChannel';
import { InstallSourceKind, getInstallSource } from './installSource';

export type UpdateStatus =
  | { available: false }
  | {
      available: true;
      version: string;
      installSource: InstallSourceKind;
    };

const NO_UPDATE: UpdateStatus = { available: false };

/**
 * Comparing versions by hand looks like ten lines and is not: the first
 * differing part has to stop the comparison, and a release has to outrank its
 * own prereleases — someone running 1.2.3-beta.1 must be told about 1.2.3.
 * `compare-versions` is dependency free and main-process only, so there is no
 * reason to own that logic.
 *
 * `validate` comes first because `compareVersions` throws on anything it
 * cannot read, and an unreadable tag must mean "no update", never a crash on
 * startup.
 */
function isNewerVersion(candidate: string, current: string): boolean {
  if (!validate(candidate) || !validate(current)) {
    return false;
  }

  return compareVersions(candidate, current) > 0;
}

type GithubRelease = {
  tag_name: string;
};

function getLatestReleaseUrl(): string {
  const repositoryPath = new URL(packageJson.repository.url).pathname
    .replace(/\.git$/, '')
    .replace(/^\//, '');

  return `https://api.github.com/repos/${repositoryPath}/releases/latest`;
}

/**
 * `net.fetch` rather than Node's: it goes through Chromium's network stack, so
 * it honours the system proxy. On a corporate machine that is the difference
 * between working and never working without anyone knowing why.
 */
async function fetchLatestRelease(): Promise<GithubRelease | null> {
  try {
    const response = await net.fetch(getLatestReleaseUrl(), {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': `${packageJson.name}/${app.getVersion()}`,
      },
    });

    if (!response.ok) {
      // 403 is the anonymous rate limit — 60 requests per hour and per IP,
      // which a corporate NAT can exhaust on its own. Not worth an error.
      log.info(`update check: GitHub answered ${response.status}`);

      return null;
    }

    return (await response.json()) as GithubRelease;
  } catch (error) {
    log.info('update check: could not reach GitHub', error);

    return null;
  }
}

async function computeUpdateStatus(): Promise<UpdateStatus> {
  // in dev the version is whatever is in package.json, and a permanent dot in
  // the header would be pure noise
  if (!app.isPackaged) {
    return NO_UPDATE;
  }

  const release = await fetchLatestRelease();

  if (!release || !isNewerVersion(release.tag_name, app.getVersion())) {
    return NO_UPDATE;
  }

  return {
    available: true,
    version: release.tag_name.replace(/^v/, ''),
    installSource: getInstallSource(),
  };
}

let cachedStatus: Promise<UpdateStatus> | null = null;

/**
 * One network call per session: a desktop app that is left open for days has
 * no reason to poll, and the answer only changes when the user restarts.
 */
function checkForUpdate(): Promise<UpdateStatus> {
  cachedStatus ??= computeUpdateStatus();

  return cachedStatus;
}

const IPC_EVENT_BINDING = {
  [UPDATE_CHANNEL.CHECK]: checkForUpdate,
} as const;

export function bindIpcMainUpdate(ipcMain: Electron.IpcMain): void {
  for (const [channel, handler] of Object.entries(IPC_EVENT_BINDING)) {
    ipcMain.handle(channel, () => handler());
  }
}
