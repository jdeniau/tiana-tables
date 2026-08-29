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

function isNewerVersion(candidate: string, current: string): boolean {
  // compareVersions throws on what it cannot read
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

/** `net.fetch`, not Node's: it honours the system proxy. */
async function fetchLatestRelease(): Promise<GithubRelease | null> {
  try {
    const response = await net.fetch(getLatestReleaseUrl(), {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': `${packageJson.name}/${app.getVersion()}`,
      },
    });

    if (!response.ok) {
      // 403 is the anonymous rate limit: 60/h per IP, not an error
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
  // a permanent dot in dev would be noise
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

/** One call per session: the answer only changes on restart. */
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
