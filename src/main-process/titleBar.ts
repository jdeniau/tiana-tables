import {
  BrowserWindow,
  BrowserWindowConstructorOptions,
  Menu,
  MenuItem,
} from 'electron';
import { z } from 'zod';
import { AppTheme } from '../configuration/themes';
import {
  AppMenuItem,
  AppMenuItemKind,
  MenuItemPath,
  TITLE_BAR_CHANNEL,
  TitleBarColors,
} from '../preload/titleBarChannel';
import { isMacPlatform } from './helpers';

/** `size.titleBar` of the renderer theme, as the number Electron takes */
const TITLE_BAR_HEIGHT = 38;

/** The window has no system title bar: the renderer's own is drawn in its place, under the window controls. */
export function titleBarWindowOptions(
  theme: AppTheme
): BrowserWindowConstructorOptions {
  return {
    titleBarStyle: 'hidden',
    // the traffic lights, centred on the 38px bar
    trafficLightPosition: { x: 12, y: 12 },
    titleBarOverlay: {
      color: theme.palette.base00,
      symbolColor: theme.palette.base05,
      height: TITLE_BAR_HEIGHT,
    },
    backgroundColor: theme.palette.base00,
  };
}

const titleBarColorsSchema: z.ZodType<TitleBarColors> = z.object({
  color: z.string(),
  symbolColor: z.string(),
});

const menuItemPathSchema: z.ZodType<MenuItemPath> = z
  .array(z.number().int().nonnegative())
  .min(1);

/** The visible items of a menu, each with the path that finds it back. */
function toAppMenuItems(
  items: Array<MenuItem>,
  parentPath: MenuItemPath
): Array<AppMenuItem> {
  return items.flatMap((item, index): Array<AppMenuItem> => {
    if (!item.visible) {
      return [];
    }

    const path = [...parentPath, index];

    if (item.type === 'separator') {
      return [{ kind: AppMenuItemKind.Separator }];
    }

    if (item.submenu) {
      return [
        {
          kind: AppMenuItemKind.Submenu,
          path,
          label: item.label,
          enabled: item.enabled,
          items: toAppMenuItems(item.submenu.items, path),
        },
      ];
    }

    const checkable = item.type === 'checkbox' || item.type === 'radio';

    return [
      {
        kind: AppMenuItemKind.Action,
        path,
        label: item.label,
        accelerator: item.accelerator,
        enabled: item.enabled,
        checked: checkable ? item.checked : undefined,
      },
    ];
  });
}

/** The item at the end of the path, if every item on the way can be reached. */
function findMenuItem(
  menu: Menu | null,
  [index, ...rest]: MenuItemPath
): MenuItem | undefined {
  const item = menu?.items[index];

  if (!item?.visible || !item.enabled) {
    return undefined;
  }

  return rest.length === 0 ? item : findMenuItem(item.submenu ?? null, rest);
}

export function bindIpcMainTitleBar(ipcMain: Electron.IpcMain): void {
  ipcMain.handle(TITLE_BAR_CHANNEL.SET_COLORS, (event, payload: unknown) => {
    const colors = titleBarColorsSchema.parse(payload);

    // macOS draws its traffic lights in the system colours, whatever is asked
    if (isMacPlatform()) {
      return;
    }

    const window = BrowserWindow.fromWebContents(event.sender);

    window?.setTitleBarOverlay({ ...colors, height: TITLE_BAR_HEIGHT });
    window?.setBackgroundColor(colors.color);
  });

  // read on each opening: the states change (a connection enables the SQL panel)
  ipcMain.handle(TITLE_BAR_CHANNEL.GET_MENU, (): Array<AppMenuItem> =>
    toAppMenuItems(Menu.getApplicationMenu()?.items ?? [], [])
  );

  // the application menu's own item, so that its role, handler and checkbox run
  ipcMain.handle(
    TITLE_BAR_CHANNEL.CLICK_MENU_ITEM,
    (event, payload: unknown) => {
      const path = menuItemPathSchema.parse(payload);
      const item = findMenuItem(Menu.getApplicationMenu(), path);

      if (!item || item.submenu || item.type === 'separator') {
        return;
      }

      item.click(
        undefined,
        BrowserWindow.fromWebContents(event.sender),
        event.sender
      );
    }
  );
}
