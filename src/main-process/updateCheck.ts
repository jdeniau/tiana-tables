import { BrowserWindow, app, autoUpdater, net } from 'electron';
import { compareVersions, validate } from 'compare-versions';
import log from 'electron-log';
import { updateElectronApp } from 'update-electron-app';
import packageJson from '../../package.json';
import { UPDATE_CHANNEL } from '../preload/updateChannel';
import { getInstallSource } from './installSource';
import { UpdateStatus, UpdateStep } from './updateStatus';

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

function getRepositoryPath(): string {
  return new URL(packageJson.repository.url).pathname
    .replace(/\.git$/, '')
    .replace(/^\//, '');
}

function getLatestReleaseUrl(): string {
  return `https://api.github.com/repos/${getRepositoryPath()}/releases/latest`;
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

/** The version to install, if GitHub has a newer one. */
async function fetchNewerVersion(): Promise<string | null> {
  // a permanent dot in dev would be noise
  if (!app.isPackaged) {
    return null;
  }

  const release = await fetchLatestRelease();

  if (!release || !isNewerVersion(release.tag_name, app.getVersion())) {
    return null;
  }

  return release.tag_name.replace(/^v/, '');
}

let cachedNewerVersion: Promise<string | null> | null = null;

/** One call per session: the answer only changes on restart. */
function getNewerVersion(): Promise<string | null> {
  cachedNewerVersion ??= fetchNewerVersion();

  return cachedNewerVersion;
}

enum AutoUpdateState {
  /** checking, downloading, or up to date */
  Idle = 'idle',
  Failed = 'failed',
  /** installed on the next start, or by `quitAndInstall` */
  Downloaded = 'downloaded',
}

let autoUpdateState = AutoUpdateState.Idle;

async function getUpdateStatus(): Promise<UpdateStatus> {
  const version = await getNewerVersion();

  // read once GitHub has answered: an auto-updater event may have come in the meantime
  if (autoUpdateState === AutoUpdateState.Downloaded) {
    return { available: true, step: UpdateStep.Restart };
  }

  if (!version) {
    return NO_UPDATE;
  }

  const installSource = getInstallSource();

  // the auto-updater brings this version itself: only its failure calls for a download
  if (
    installSource === 'selfUpdating' &&
    autoUpdateState !== AutoUpdateState.Failed
  ) {
    return NO_UPDATE;
  }

  return {
    available: true,
    step: UpdateStep.Download,
    version,
    installSource,
    releaseUrl: `https://github.com/${getRepositoryPath()}/releases/latest`,
  };
}

async function sendUpdateStatus(): Promise<void> {
  const status = await getUpdateStatus();

  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(UPDATE_CHANNEL.STATUS_CHANGED, status);
  }
}

function setAutoUpdateState(state: AutoUpdateState): void {
  // a downloaded update stays installable whatever a later check reports
  if (
    autoUpdateState === state ||
    autoUpdateState === AutoUpdateState.Downloaded
  ) {
    return;
  }

  autoUpdateState = state;
  void sendUpdateStatus();
}

/** Squirrel, behind update-electron-app, exists on Windows and macOS only. */
export function startAutoUpdate(): void {
  if (getInstallSource() !== 'selfUpdating') {
    return;
  }

  autoUpdater.on('error', () => setAutoUpdateState(AutoUpdateState.Failed));
  autoUpdater.on('update-available', () =>
    setAutoUpdateState(AutoUpdateState.Idle)
  );
  autoUpdater.on('update-not-available', () =>
    setAutoUpdateState(AutoUpdateState.Idle)
  );
  autoUpdater.on('update-downloaded', () =>
    setAutoUpdateState(AutoUpdateState.Downloaded)
  );

  updateElectronApp({ logger: log });
}

function restartToUpdate(): void {
  // on Windows, `quitAndInstall` before a download only emits an error
  if (autoUpdateState !== AutoUpdateState.Downloaded) {
    return;
  }

  autoUpdater.quitAndInstall();
}

const IPC_EVENT_BINDING = {
  [UPDATE_CHANNEL.CHECK]: getUpdateStatus,
  [UPDATE_CHANNEL.RESTART]: restartToUpdate,
} as const;

export function bindIpcMainUpdate(ipcMain: Electron.IpcMain): void {
  for (const [channel, handler] of Object.entries(IPC_EVENT_BINDING)) {
    ipcMain.handle(channel, () => handler());
  }
}
