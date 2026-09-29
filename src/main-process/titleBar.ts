import { BrowserWindow, BrowserWindowConstructorOptions, Menu } from 'electron';
import { AppTheme } from '../configuration/themes';
import {
  MenuAnchor,
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

function isTitleBarColors(value: unknown): value is TitleBarColors {
  return (
    typeof value === 'object' &&
    value !== null &&
    'color' in value &&
    typeof value.color === 'string' &&
    'symbolColor' in value &&
    typeof value.symbolColor === 'string'
  );
}

function isMenuAnchor(value: unknown): value is MenuAnchor {
  return (
    typeof value === 'object' &&
    value !== null &&
    'x' in value &&
    Number.isFinite(value.x) &&
    'y' in value &&
    Number.isFinite(value.y)
  );
}

export function bindIpcMainTitleBar(ipcMain: Electron.IpcMain): void {
  ipcMain.handle(TITLE_BAR_CHANNEL.SET_COLORS, (event, colors: unknown) => {
    if (!isTitleBarColors(colors)) {
      throw new TypeError('The title bar takes a color and a symbolColor');
    }

    // macOS draws its traffic lights in the system colours, whatever is asked
    if (isMacPlatform()) {
      return;
    }

    const window = BrowserWindow.fromWebContents(event.sender);

    window?.setTitleBarOverlay({ ...colors, height: TITLE_BAR_HEIGHT });
    window?.setBackgroundColor(colors.color);
  });

  // the application menu itself, so its items, accelerators and states are the ones the shortcuts run
  ipcMain.handle(TITLE_BAR_CHANNEL.OPEN_MENU, (event, anchor: unknown) => {
    if (!isMenuAnchor(anchor)) {
      throw new TypeError('The menu opens at an x and a y');
    }

    const window = BrowserWindow.fromWebContents(event.sender);

    if (!window) {
      return;
    }

    // the page counts in CSS pixels, the window in device-independent ones
    const zoom = event.sender.getZoomFactor();

    Menu.getApplicationMenu()?.popup({
      window,
      x: Math.round(anchor.x * zoom),
      y: Math.round(anchor.y * zoom),
    });
  });
}
