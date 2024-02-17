import { BrowserWindow, app, dialog, ipcMain, safeStorage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import installExtension, {
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import envPaths from 'env-paths';
import { ConnectionObject } from './component/Connection';
import { createConnection } from 'mysql';

const envPath = envPaths('FuzzyPotato', { suffix: '' });

require('dotenv').config({ path: '../.env' });

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Function to write data to the JSON file
// function writeDataToFile(data) {
//   const dataString = JSON.stringify(data, null, 2);
//   fs.writeFileSync(dataFilePath, dataString);
// }

// Function to read data from the JSON file
// function readDataFromFile() {
//   if (fs.existsSync(dataFilePath)) {
//     const dataString = fs.readFileSync(dataFilePath, 'utf-8');
//     return JSON.parse(dataString);
//   }
//   return {};
// }

export type Configuration = {
  connections: Record<string, ConnectionObject>;
};

const dataFilePath = path.resolve(envPath.config, 'config.json');

function readConfigurationFile(): Configuration {
  if (!fs.existsSync(dataFilePath)) {
    return null;
  }

  const dataString = safeStorage.decryptString(fs.readFileSync(dataFilePath));

  return JSON.parse(dataString);
}

function addConnectionToConfig(
  event: Electron.IpcMainInvokeEvent,
  name: string,
  connection: ConnectionObject
): void {
  let config = readConfigurationFile();

  if (!config) {
    config = {
      connections: {},
    };
  }

  if (!config.connections) {
    config.connections = {};
  }

  config.connections[name] = connection;

  console.log('writing to ' + dataFilePath);
  fs.mkdirSync(envPath.config, { recursive: true });
  fs.writeFile(
    dataFilePath,
    safeStorage.encryptString(JSON.stringify(config)),
    (err) => {
      if (err) {
        dialog.showErrorBox('Error', err.message);
      }
    }
  );
}

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

  ipcMain.handle('config:read', readConfigurationFile);
  ipcMain.handle('config:connection:add', addConnectionToConfig);
  ipcMain.handle('sql:createConnection', (event, params) => {
    console.log('Creating connection to', params);
    const connection = createConnection(params);

    console.log(connection);

    return connection;
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
  if (process.platform !== 'darwin') {
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
