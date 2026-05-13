import { BrowserWindow, Menu, app, ipcMain, session } from 'electron';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import log from 'electron-log/main';
import started from 'electron-squirrel-startup';
import { updateElectronApp } from 'update-electron-app';
import {
  bindIpcMain as bindIpcMainConfiguration,
  getConfiguration,
  saveWindowState,
} from './configuration';
import { getLogPath } from './configuration/filePaths';
import { isDevApp, isMacPlatform } from './main-process/helpers';
import { installReactDevToolsExtension } from './main-process/installReactDevToolsExtension';
import { createMenu } from './main-process/menu';
import { bindIpcMainSqlFileStorage } from './main-process/sqlFileStorage';
import WindowStateKeeper from './main-process/windowState';
import connectionStackInstance from './sql';

const isMac = isMacPlatform();
const isDev = isDevApp();
const startupStart = performance.now();

function logStartupMilestone(name: string): void {
  log.info(
    `[startup][main] ${name}: +${Math.round(performance.now() - startupStart)}ms`
  );
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// log files are stored in the userData folder, and the file name is different in dev and prod
log.transports.file.resolvePathFn = () => getLogPath();
log.initialize();
logStartupMilestone('module-initialized');

const createWindow = () => {
  logStartupMilestone('create-window-start');
  const configuration = getConfiguration();

  // create handle that will manage the window size state
  const mainWindowStateHandler = new WindowStateKeeper(
    configuration.windowState,
    saveWindowState
  );

  const mainWindow = mainWindowStateHandler.createBrowserWindow({
    icon: 'images/icons/icon.png',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  logStartupMilestone('main-window-created');

  Menu.setApplicationMenu(createMenu(mainWindow));

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }
  logStartupMilestone('main-window-load-triggered');

  // Forward renderer console messages tagged "[startup]" to the main log file
  // so we can measure renderer startup in production builds.
  mainWindow.webContents.on('console-message', (_event, _level, message) => {
    if (message.includes('[startup]')) {
      log.info(message);
    }
  });

  mainWindow.webContents.once('did-start-loading', () => {
    logStartupMilestone('webcontents-did-start-loading');
  });

  mainWindow.webContents.once('dom-ready', () => {
    logStartupMilestone('webcontents-dom-ready');
  });

  mainWindow.webContents.once('did-stop-loading', () => {
    logStartupMilestone('webcontents-did-stop-loading');
  });

  mainWindow.webContents.once('did-finish-load', () => {
    logStartupMilestone('main-window-did-finish-load');
  });

  mainWindow.once('ready-to-show', () => {
    logStartupMilestone('main-window-ready-to-show');
    mainWindow.show();

    // Defer non-critical initialization to the next event-loop task after first window display.
    setTimeout(() => {
      if (isDev) {
        void installReactDevToolsExtension();
        logStartupMilestone('react-devtools-install-triggered');
      } else {
        updateElectronApp({
          logger: log,
        });
        logStartupMilestone('auto-update-initialized');
      }
    }, 0);
  });

  // Open the DevTools.
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  logStartupMilestone('app-ready');
  createWindow();
});

app.whenReady().then(() => {
  logStartupMilestone('app-when-ready');
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          // TODO maybe disable unsafe-inline for style-src on build ?
          "default-src 'self'; style-src 'self' 'unsafe-inline'",
        ],
      },
    });
  });

  bindIpcMainConfiguration(ipcMain);
  bindIpcMainSqlFileStorage(ipcMain);
  connectionStackInstance.bindIpcMain(ipcMain);
  logStartupMilestone('ipc-bound');

  ipcMain.handle('get-is-dev', () => {
    return isDev;
  });

  ipcMain.handle('get-is-mac', () => {
    return isMac;
  });

  // createWindow();
  // app.on('activate', function () {
  //   if (BrowserWindow.getAllWindows().length === 0) createWindow();
  // });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
