import { BrowserWindow, Menu, app, ipcMain, session } from 'electron';
import path from 'node:path';
import log from 'electron-log/main';
import { updateElectronApp } from 'update-electron-app';
import { bindIpcMain as bindIpcMainConfiguration } from './configuration';
import { getLogPath } from './configuration/filePaths';
import { isDevApp, isMacPlatform } from './main-process/helpers';
import { installReactDevToolsExtension } from './main-process/installReactDevToolsExtension';
import { createMenu } from './main-process/menu';
import connectionStackInstance from './sql';

const isMac = isMacPlatform();
const isDev = isDevApp();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// log files are stored in the userData folder, and the file name is different in dev and prod
log.transports.file.resolvePathFn = () => getLogPath();
log.initialize();

updateElectronApp({
  logger: log,
});

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  Menu.setApplicationMenu(createMenu(mainWindow));

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open the DevTools.
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

app.whenReady().then(() => {
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

  installReactDevToolsExtension();

  bindIpcMainConfiguration(ipcMain);
  connectionStackInstance.bindIpcMain(ipcMain);

  ipcMain.handle('get-is-dev', () => {
    return isDev;
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
