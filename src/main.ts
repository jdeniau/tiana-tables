import { BrowserWindow, app, ipcMain } from 'electron';
import path from 'node:path';
import installExtension, {
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import connectionStackInstance from './sql';
import {
  getConfiguration,
  addConnectionToConfig,
  changeTheme,
  updateConnectionState,
} from './configuration';
import { ConnectionObject } from './component/Connection';
import { ConnectionAppState } from './configuration/type';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const isMac = process.platform !== 'darwin';

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

app.whenReady().then(() => {
  installExtension(REACT_DEVELOPER_TOOLS)
    .then((name) => console.log(`Added Extension:  ${name}`))
    .catch((err) => console.log('An error occurred: ', err));

  ipcMain.handle('config:get', getConfiguration);
  ipcMain.handle(
    'config:connection:add',
    (event: unknown, connection: ConnectionObject) =>
      addConnectionToConfig(connection)
  );
  ipcMain.handle('config:theme:change', (event: unknown, name: string) =>
    changeTheme(name)
  );
  ipcMain.handle(
    'config:connection:updateState',
    <K extends keyof ConnectionAppState>(
      event: unknown,
      connectionName: string,
      key: K,
      value: ConnectionAppState[K]
    ) => updateConnectionState(connectionName, key, value)
  );

  connectionStackInstance.bindIpcMain(ipcMain);

  // createWindow();
  // app.on('activate', function () {
  //   if (BrowserWindow.getAllWindows().length === 0) createWindow();
  // });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (isMac) {
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
