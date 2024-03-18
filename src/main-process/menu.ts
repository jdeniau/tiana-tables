import { BrowserWindow, Menu, ipcMain, shell } from 'electron';
import {
  getConfigurationFolder,
  getLogFolder,
} from '../configuration/filePaths';
import { SQL_CHANNEL } from '../preload/sqlChannel';
import connectionStackInstance from '../sql';
import { isMacPlatform } from './helpers';

const isMac = isMacPlatform();

export function createMenu(mainWindow: BrowserWindow) {
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
        {
          id: 'openNavigationPanelLink',
          label: 'Open navigation panel',
          accelerator: 'CmdOrCtrl+K',
          enabled: false,
          click: () => {
            mainWindow.webContents.send('openNavigationPanel');
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
          // display two menu: one for the logs, the other for the configuration folder
          // TODO : we should remove this in a future version (v1.0.0 ?) as debug should not be required anymore
          label: 'Data folders',
          submenu: [
            {
              label: 'Logs',
              click: () => {
                shell.openPath(getLogFolder());
              },
            },
            {
              label: 'Configuration',
              click: () => {
                shell.openPath(getConfigurationFolder());
              },
            },
          ],
        },
        {
          label: 'Github Repository',
          click: async () => {
            await shell.openExternal('https://github.com/jdeniau/tiana-tables');
          },
        },
      ],
    },
  ];

  const MENU_ITEMS_THAT_NEEDS_CONNECTION = [
    'sqlPanelLink',
    'openNavigationPanelLink',
  ];

  // @ts-expect-error template is a Menu, issue with the `ìsMac`and the array unpacking
  const menu = Menu.buildFromTemplate(template);

  ipcMain.on(SQL_CHANNEL.ON_CONNECTION_CHANGED, () => {
    // on connection change, let's activate the SQL panel link menu
    // do wait because the event is also handled by the sql connectionStack
    setTimeout(() => {
      MENU_ITEMS_THAT_NEEDS_CONNECTION.forEach((id) => {
        const sqlPanelLink = menu.getMenuItemById(id);

        if (!sqlPanelLink) {
          return;
        }

        sqlPanelLink.enabled = Boolean(
          connectionStackInstance.currentConnectionName &&
            connectionStackInstance.databaseName
        );
      });
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
  return menu;
}
