import type { BrowserWindow } from 'electron';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { UPDATE_CHANNEL } from '../preload/updateChannel';
import type { InstallSourceKind } from './installSource';
import { UpdateStep } from './updateStatus';

vi.mock('electron', async () => {
  const { EventEmitter } = await import('node:events');

  return {
    app: { isPackaged: true, getVersion: () => '1.0.0' },
    net: { fetch: vi.fn() },
    autoUpdater: Object.assign(new EventEmitter(), { quitAndInstall: vi.fn() }),
    BrowserWindow: { getAllWindows: vi.fn() },
  };
});

vi.mock('electron-log', () => ({ default: { info: vi.fn() } }));
vi.mock('update-electron-app', () => ({ updateElectronApp: vi.fn() }));
vi.mock('./installSource', () => ({ getInstallSource: vi.fn() }));

const RELEASE_PAGE = 'https://github.com/jdeniau/tiana-tables/releases/latest';

const RESTART = { available: true, step: UpdateStep.Restart };

function latestRelease(tagName: string): Response {
  return new Response(JSON.stringify({ tag_name: tagName }));
}

/** A fresh module: its state lives as long as the app does. */
async function start(installSource: InstallSourceKind) {
  vi.resetModules();

  const electron = await import('electron');
  const { getInstallSource } = await import('./installSource');
  const { updateElectronApp } = await import('update-electron-app');
  const { bindIpcMainUpdate, startAutoUpdate } = await import('./updateCheck');

  // the mocked `electron` outlives `resetModules`, its listeners with it
  electron.autoUpdater.removeAllListeners();
  vi.mocked(getInstallSource).mockReturnValue(installSource);
  vi.mocked(electron.net.fetch).mockResolvedValue(latestRelease('v1.3.0'));

  const send = vi.fn();
  vi.mocked(electron.BrowserWindow.getAllWindows).mockReturnValue([
    { webContents: { send } } as unknown as BrowserWindow,
  ]);

  const handlers = new Map<string, () => unknown>();
  bindIpcMainUpdate({
    handle: (channel: string, handler: () => unknown) => {
      handlers.set(channel, handler);
    },
  } as unknown as Electron.IpcMain);

  startAutoUpdate();

  return {
    autoUpdater: electron.autoUpdater,
    fetch: vi.mocked(electron.net.fetch),
    updateElectronApp: vi.mocked(updateElectronApp),
    send,
    check: () => handlers.get(UPDATE_CHANNEL.CHECK)?.(),
    restart: () => handlers.get(UPDATE_CHANNEL.RESTART)?.(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('without an auto-updater', () => {
  test('a newer version links to the release page', async () => {
    const { check, updateElectronApp } = await start('linuxPackage');

    expect(await check()).toEqual({
      available: true,
      step: UpdateStep.Download,
      version: '1.3.0',
      installSource: 'linuxPackage',
      releaseUrl: RELEASE_PAGE,
    });
    expect(updateElectronApp).not.toHaveBeenCalled();
  });
});

describe('with an auto-updater', () => {
  test('nothing is shown while it checks or downloads', async () => {
    const { autoUpdater, check, updateElectronApp } =
      await start('selfUpdating');

    autoUpdater.emit('update-available');

    expect(await check()).toEqual({ available: false });
    expect(updateElectronApp).toHaveBeenCalledOnce();
  });

  test('its failure links to the release page', async () => {
    const { autoUpdater, check, send } = await start('selfUpdating');

    autoUpdater.emit('error', new Error('offline'));

    const download = {
      available: true,
      step: UpdateStep.Download,
      version: '1.3.0',
      installSource: 'selfUpdating',
      releaseUrl: RELEASE_PAGE,
    };

    await vi.waitFor(() =>
      expect(send).toHaveBeenCalledWith(UPDATE_CHANNEL.STATUS_CHANGED, download)
    );
    expect(await check()).toEqual(download);
  });

  test('a downloaded update asks for a restart, whatever a later check reports', async () => {
    const { autoUpdater, check, send } = await start('selfUpdating');

    autoUpdater.emit('update-downloaded');

    await vi.waitFor(() =>
      expect(send).toHaveBeenCalledWith(UPDATE_CHANNEL.STATUS_CHANGED, RESTART)
    );

    autoUpdater.emit('error', new Error('offline'));

    expect(await check()).toEqual(RESTART);
  });

  test('a download reported while GitHub answers is not lost', async () => {
    const { autoUpdater, check, fetch } = await start('selfUpdating');
    const github = Promise.withResolvers<Response>();
    fetch.mockReturnValue(github.promise);

    const status = check();
    autoUpdater.emit('update-downloaded');
    github.resolve(latestRelease('v1.3.0'));

    expect(await status).toEqual(RESTART);
  });

  test('restarts only onto a downloaded update', async () => {
    const { autoUpdater, restart } = await start('selfUpdating');

    restart();
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();

    autoUpdater.emit('update-downloaded');
    restart();
    expect(autoUpdater.quitAndInstall).toHaveBeenCalledOnce();
  });
});
