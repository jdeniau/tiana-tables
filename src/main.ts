import { BrowserWindow, Menu, app, ipcMain, session, shell } from 'electron';
import path from 'node:path';
import installExtension, {
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import log from 'electron-log/main';
import invariant from 'tiny-invariant';
import { updateElectronApp } from 'update-electron-app';
import { bindIpcMain as bindIpcMainConfiguration } from './configuration';
import { SQL_CHANNEL } from './preload/sqlChannel';
import connectionStackInstance from './sql';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const isMac = process.platform === 'darwin';
const isDev = !app.isPackaged;

// log files are stored in the userData folder, and the file name is different in dev and prod
log.transports.file.resolvePathFn = () =>
  path.join(app.getPath('userData'), 'logs', isDev ? 'dev.log' : 'main.log');

log.initialize();

updateElectronApp({
  logger: log,
});

function installReactDevToolsExtension() {
  // don't install the extension in production
  if (!isDev) {
    return;
  }

  installExtension(REACT_DEVELOPER_TOOLS)
    .then((name) => {
      log.debug(`Added Extension:  ${name}`);

      // once extension is loaded, reload the view after a short period (probably to be sure that the extension is loaded ?)
      BrowserWindow.getAllWindows().forEach((win) => {
        setTimeout(() => {
          win.webContents.reload();
        }, 1000);
      });
    })
    .catch((err) => console.error('Unable to install extension: ', err));
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

  const template = [
    ...(isMac
      ? [
          {
            role: 'appMenu',
            // label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      role: 'fileMenu',
      // label: 'File',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
    },
    {
      role: 'editMenu',
      // label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }],
              },
            ]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
      ],
    },
    //
    {
      label: 'Navigate', // TODO transations
      submenu: [
        {
          label: 'New connection',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('navigate', '/connect');
          },
        },
        {
          id: 'sqlPanelLink',
          label: 'SQL panel',
          accelerator: 'CmdOrCtrl+T',
          enabled: false, // wait for a connection to be selected
          click: () => {
            const { currentConnectionName, databaseName } =
              connectionStackInstance;

            if (!currentConnectionName || !databaseName) {
              // should not happen as the menu item is disabled
              return;
            }

            mainWindow.webContents.send(
              'navigate',
              `/connections/${currentConnectionName}/${databaseName}/sql`
            );
          },
        },
      ],
    },
    {
      role: 'viewMenu',
      // label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      role: 'windowMenu',
      // label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' },
            ]
          : [{ role: 'close' }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Github Repository',
          click: async () => {
            await shell.openExternal('https://github.com/jdeniau/tiana-tables');
          },
        },
      ],
    },
  ];

  // @ts-expect-error template is a Menu, issue with the `ìsMac`and the array unpacking
  const menu = new Menu(template);

  ipcMain.on(SQL_CHANNEL.ON_CONNECTION_CHANGED, () => {
    // on connection change, let's activate the SQL panel link menu
    // do wait because the event is also handled by the sql connectionStack
    setTimeout(() => {
      const sqlPanelLink = menu.getMenuItemById('sqlPanelLink');

      invariant(sqlPanelLink, 'SQL panel link is required');

      sqlPanelLink.enabled = Boolean(
        connectionStackInstance.currentConnectionName &&
          connectionStackInstance.databaseName
      );
    }, 1);
  });
  // menu.append(
  //   new MenuItem({
  //     label: 'Electron',
  //     submenu: [
  //       {
  //         role: 'help',
  //         accelerator:
  //           process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Alt+Shift+I',
  //         click: () => {
  //           console.log('Electron rocks!');
  //         },
  //       },
  //     ],
  //   })
  // );

  Menu.setApplicationMenu(menu);

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
