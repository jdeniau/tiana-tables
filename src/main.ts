import { BrowserWindow, Menu, app, ipcMain, session, shell } from 'electron';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import log from 'electron-log/main';
import started from 'electron-squirrel-startup';
import {
  bindIpcMain as bindIpcMainConfiguration,
  getConfiguration,
  saveWindowState,
} from './configuration';
import { logEncryptionStatus } from './configuration/encryption';
import { getLogPath } from './configuration/filePaths';
import { DEFAULT_THEME, THEME_LIST } from './configuration/themes';
import { QuitToFixConfigurationError } from './configuration/unreadableConfiguration';
import { changeLanguage, onLanguageChanged } from './i18n';
import { bindIpcMainClipboard } from './main-process/clipboard';
import { isDevApp, isMacPlatform } from './main-process/helpers';
import {
  installReactDevToolsExtension,
  warnIfDevToolsHookIsMissing,
} from './main-process/installReactDevToolsExtension';
import { bindMenuListeners, createMenu } from './main-process/menu';
import { bindIpcMainSqlFileStorage } from './main-process/sqlFileStorage';
import {
  bindIpcMainTitleBar,
  titleBarWindowOptions,
} from './main-process/titleBar';
import { bindIpcMainUpdate, startAutoUpdate } from './main-process/updateCheck';
import WindowStateKeeper from './main-process/windowState';
import { APP_CHANNEL } from './preload/appChannel';
import connectionStackInstance from './sql';
import { askpassServer, bindIpcMainSshQuestion } from './ssh/askpass/ipc';

const isMac = isMacPlatform();
const isDev = isDevApp();
const startupStart = performance.now();

// Where the renderer is served from: the Vite dev server in development, a local file in a build.
const appOrigin = MAIN_WINDOW_VITE_DEV_SERVER_URL
  ? new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL).origin
  : 'file://';

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

// two instances on one profile each write config.json from their own copy, erasing what the other saved
const isFirstInstance = app.requestSingleInstanceLock();

if (!isFirstInstance) {
  log.warn(
    'Another instance uses this profile: it comes forward, this one quits'
  );
  app.quit();
}

app.on('second-instance', () => {
  const [mainWindow] = BrowserWindow.getAllWindows();

  if (mainWindow?.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow?.focus();
});

const createWindow = () => {
  logStartupMilestone('create-window-start');
  const configuration = getConfiguration();

  // create handle that will manage the window size state
  const mainWindowStateHandler = new WindowStateKeeper(
    configuration.windowState,
    saveWindowState
  );

  const mainWindow = mainWindowStateHandler.createBrowserWindow({
    ...titleBarWindowOptions(THEME_LIST[configuration.theme] ?? DEFAULT_THEME),
    icon: 'images/icons/icon.png',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });
  logStartupMilestone('main-window-created');

  // its labels are translated once, when it is built
  const setMenu = () => Menu.setApplicationMenu(createMenu(mainWindow));
  setMenu();
  const stopRebuilding = onLanguageChanged(setMenu);
  mainWindow.on('closed', stopRebuilding);
  bindMenuListeners(mainWindow);

  // A middle click on a link would otherwise pop a second window, empty for want of our preload.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(appOrigin) && /^https?:\/\//.test(url)) {
      shell.openExternal(url);
    }

    return { action: 'deny' };
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }
  logStartupMilestone('main-window-load-triggered');

  warnIfDevToolsHookIsMissing(mainWindow.webContents);

  // Forward renderer console messages tagged "[startup]" to the main log file
  // so we can measure renderer startup in production builds.
  mainWindow.webContents.on('console-message', (details) => {
    if (details.message.includes('[startup]')) {
      log.info(details.message);
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
      if (!isDev) {
        startAutoUpdate();
        logStartupMilestone('auto-update-initialized');
      }
    }, 0);
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // quitting, and must neither read nor write the configuration
  if (!isFirstInstance) {
    return;
  }

  logStartupMilestone('app-when-ready');

  // read first: over an unreadable file the user may choose to quit, and nothing must have started by then
  try {
    getConfiguration();
  } catch (error) {
    if (error instanceof QuitToFixConfigurationError) {
      return;
    }

    throw error;
  }

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          // TODO maybe disable unsafe-inline for style-src on build ?
          // `img-src ... data:` is required by Monaco, which draws squiggly
          // error underlines with an inlined SVG background image.
          "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:",
        ],
      },
    });
  });

  // After `ready`: safeStorage only initializes its encryptor once the app is.
  await logEncryptionStatus();

  // the main process has its own i18next instance, which its menu and dialogs read: the configuration's `changeLanguage` switches it afterwards
  await changeLanguage(getConfiguration().locale);

  bindIpcMainConfiguration(ipcMain);
  bindIpcMainSqlFileStorage(ipcMain);
  bindIpcMainClipboard(ipcMain);
  bindIpcMainTitleBar(ipcMain);
  bindIpcMainUpdate(ipcMain);
  connectionStackInstance.bindIpcMain(ipcMain);
  bindIpcMainSshQuestion(ipcMain);
  logStartupMilestone('ipc-bound');

  ipcMain.handle(APP_CHANNEL.GET_IS_DEV, () => {
    return isDev;
  });

  ipcMain.handle(APP_CHANNEL.GET_IS_MAC, () => {
    return isMac;
  });

  // React DevTools must be loaded before the renderer starts: the hook it
  // installs has to be on the page before React initializes.
  await installReactDevToolsExtension();
  logStartupMilestone('react-devtools-installed');

  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

// the askpass socket and launcher live in the temporary folder
app.on('will-quit', () => {
  askpassServer.close();
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
