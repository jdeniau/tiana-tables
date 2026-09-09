import { BrowserWindow, Menu, ipcMain, shell } from 'electron';
import {
  getConfigurationFolder,
  getLogFolder,
} from '../configuration/filePaths';
import { t } from '../i18n';
import { SQL_CHANNEL } from '../preload/sqlChannel';
import connectionStackInstance from '../sql';
import { isDevApp, isMacPlatform } from './helpers';

const isMac = isMacPlatform();

export function createMenu(mainWindow: BrowserWindow) {
  // the preferences of the platform: the app menu on macOS, File elsewhere
  const settingsItem = {
    label: t('menu.settings'),
    accelerator: 'CmdOrCtrl+,',
    click: () => {
      mainWindow.webContents.send('openSettings');
    },
  };

  const template = [
    ...(isMac
      ? [
          {
            role: 'appMenu',
            // label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              settingsItem,
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
      submenu: isMac
        ? [{ role: 'close' }]
        : [settingsItem, { type: 'separator' }, { role: 'quit' }],
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
      label: t('menu.navigate'),
      submenu: [
        {
          label: t('menu.navigate.previous'),
          accelerator: 'Alt+Left',
          click: () => {
            mainWindow.webContents.send('navigate', -1);
          },
        },
        {
          label: t('menu.navigate.next'),
          accelerator: 'Alt+Right',
          click: () => {
            mainWindow.webContents.send('navigate', 1);
          },
        },
        {
          label: t('menu.navigate.newConnection'),
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('navigate', '/connect');
          },
        },
        {
          id: 'sqlPanelLink',
          label: t('menu.navigate.sqlPanel'),
          accelerator: 'CmdOrCtrl+T',
          enabled: false, // wait for a connection to be selected
          click: () => {
            const { currentConnectionSlug, databaseName } =
              connectionStackInstance;

            if (!currentConnectionSlug || !databaseName) {
              // should not happen as the menu item is disabled
              return;
            }

            mainWindow.webContents.send(
              'navigate',
              `/connections/${currentConnectionSlug}/${databaseName}/sql`
            );
          },
        },
        {
          id: 'openNavigationPanelLink',
          label: t('menu.navigate.openNavigationPanel'),
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
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        {
          type: 'separator',
        },
        {
          label: t('menu.view.devTools'),
          submenu: [
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
            {
              label: t('menu.view.togglePath'),
              type: 'checkbox',
              checked: isDevApp(),
              click: (item: Electron.MenuItem) => {
                mainWindow.webContents.send(
                  'pathBarVisibilityChange',
                  item.checked
                );
              },
            },
          ],
        },
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
          label: t('menu.help.dataFolders'),
          submenu: [
            {
              label: t('menu.help.logs'),
              click: () => {
                shell.openPath(getLogFolder());
              },
            },
            {
              label: t('menu.help.configuration'),
              click: () => {
                shell.openPath(getConfigurationFolder());
              },
            },
          ],
        },
        {
          label: t('menu.help.githubRepository'),
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

  /**
   * The items whose accelerator the page takes first. On Linux and Windows a
   * menu accelerator is only handled once the page has declined the key, and
   * the SQL editor declines little: `Ctrl+K` is the prefix of 25 Monaco
   * chords, and `Ctrl+T` never reaches the menu either.
   *
   * Only these two need it. Measured with the editor focused, `Ctrl+N`,
   * `Ctrl+,`, `Alt+Left` and `Alt+Right` all come back out of the page
   * unconsumed and reach the menu on their own.
   *
   * `before-input-event` runs before the page, whatever holds the focus, so
   * these two are triggered from there. Its `preventDefault` drops the native
   * accelerator as well, so they still fire once and only once.
   */
  const MENU_ITEMS_TRIGGERED_BEFORE_THE_PAGE = [
    'sqlPanelLink',
    'openNavigationPanelLink',
  ];

  mainWindow.webContents.on('before-input-event', (event, input) => {
    // `CmdOrCtrl` and nothing else, which is the shape of both accelerators
    // below — a `Ctrl+Shift+K` is Monaco's, not ours
    const cmdOrCtrl = isMac
      ? input.meta && !input.control
      : input.control && !input.meta;

    if (input.type !== 'keyDown' || !cmdOrCtrl || input.alt || input.shift) {
      return;
    }

    for (const id of MENU_ITEMS_TRIGGERED_BEFORE_THE_PAGE) {
      const item = menu.getMenuItemById(id);

      // a disabled item keeps its key for the page: with no connection to
      // open a SQL panel on, Monaco may as well have `Ctrl+T`
      if (!item?.enabled || !item.accelerator) {
        continue;
      }

      // `CmdOrCtrl+T` -> `t`. Only that shape is read: an accelerator holding
      // another modifier is skipped rather than fired by its key alone, so
      // adding one to the list means comparing its modifiers too.
      const [modifier, key, ...rest] = item.accelerator.split('+');

      if (modifier !== 'CmdOrCtrl' || !key || rest.length > 0) {
        continue;
      }

      if (key.toLowerCase() === input.key.toLowerCase()) {
        event.preventDefault();
        item.click();

        return;
      }
    }
  });

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
          connectionStackInstance.currentConnectionSlug &&
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
