import { BrowserWindow, Menu } from 'electron';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import { dracula } from '../configuration/palettes/dracula';
import { TITLE_BAR_CHANNEL } from '../preload/titleBarChannel';
import { isMacPlatform } from './helpers';
import { bindIpcMainTitleBar, titleBarWindowOptions } from './titleBar';

vi.mock('electron', () => ({
  BrowserWindow: { fromWebContents: vi.fn() },
  Menu: { getApplicationMenu: vi.fn() },
}));

vi.mock('./helpers', () => ({ isMacPlatform: vi.fn(() => false) }));

const window = {
  setTitleBarOverlay: vi.fn(),
  setBackgroundColor: vi.fn(),
};
const sender = {};

/** a `MenuItem` as the handlers read it */
function menuItem(fields: Record<string, unknown>) {
  return {
    type: 'normal',
    label: '',
    accelerator: null,
    visible: true,
    enabled: true,
    checked: false,
    submenu: undefined,
    click: vi.fn(),
    ...fields,
  };
}

const settings = menuItem({ label: 'Settings', accelerator: 'CmdOrCtrl+,' });
const sqlPanel = menuItem({ label: 'SQL panel', enabled: false });
const togglePath = menuItem({ label: 'Path', type: 'checkbox', checked: true });
const fileMenu = menuItem({
  type: 'submenu',
  label: 'File',
  submenu: {
    items: [
      settings,
      menuItem({ type: 'separator' }),
      menuItem({ label: 'Services', visible: false }),
      sqlPanel,
      togglePath,
    ],
  },
});
const disabledMenu = menuItem({
  type: 'submenu',
  label: 'Disabled',
  enabled: false,
  submenu: { items: [menuItem({ label: 'Inside' })] },
});
const menu = { items: [fileMenu, disabledMenu] };

type Handler = (event: { sender: typeof sender }, arg: unknown) => unknown;
const handlers = new Map<string, Handler>();

bindIpcMainTitleBar({
  handle: (channel: string, handler: Handler) => {
    handlers.set(channel, handler);
  },
} as unknown as Electron.IpcMain);

function invoke(channel: TITLE_BAR_CHANNEL, arg: unknown): unknown {
  return handlers.get(channel)?.({ sender }, arg);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(
    window as unknown as BrowserWindow
  );
  vi.mocked(Menu.getApplicationMenu).mockReturnValue(menu as unknown as Menu);
});

test('the window opens in the colours of the saved theme', () => {
  expect(titleBarWindowOptions(dracula)).toMatchObject({
    titleBarOverlay: { color: '#282a36', symbolColor: '#f8f8f2', height: 38 },
    backgroundColor: '#282a36',
  });
});

describe('set colors', () => {
  test('paints the window controls and the window behind the page', () => {
    invoke(TITLE_BAR_CHANNEL.SET_COLORS, {
      color: '#282a36',
      symbolColor: '#f8f8f2',
    });

    expect(window.setTitleBarOverlay).toHaveBeenCalledWith({
      color: '#282a36',
      symbolColor: '#f8f8f2',
      height: 38,
    });
    expect(window.setBackgroundColor).toHaveBeenCalledWith('#282a36');
  });

  test.each([
    ['nothing', undefined],
    ['a colour alone', { color: '#282a36' }],
    ['a colour that is not text', { color: 0x282a36, symbolColor: '#fff' }],
  ])('refuses %s', (_label, colors) => {
    expect(() => invoke(TITLE_BAR_CHANNEL.SET_COLORS, colors)).toThrow(
      z.ZodError
    );
    expect(window.setTitleBarOverlay).not.toHaveBeenCalled();
  });

  test('leaves the traffic lights of macOS alone', () => {
    vi.mocked(isMacPlatform).mockReturnValueOnce(true);

    invoke(TITLE_BAR_CHANNEL.SET_COLORS, {
      color: '#000',
      symbolColor: '#fff',
    });

    expect(window.setTitleBarOverlay).not.toHaveBeenCalled();
  });
});

describe('get menu', () => {
  test('describes the visible items, each with the path that finds it back', () => {
    expect(invoke(TITLE_BAR_CHANNEL.GET_MENU, undefined)).toEqual([
      {
        kind: 'submenu',
        path: [0],
        label: 'File',
        enabled: true,
        items: [
          {
            kind: 'action',
            path: [0, 0],
            label: 'Settings',
            accelerator: 'CmdOrCtrl+,',
            enabled: true,
            checked: undefined,
          },
          { kind: 'separator' },
          {
            kind: 'action',
            path: [0, 3],
            label: 'SQL panel',
            accelerator: null,
            enabled: false,
            checked: undefined,
          },
          {
            kind: 'action',
            path: [0, 4],
            label: 'Path',
            accelerator: null,
            enabled: true,
            checked: true,
          },
        ],
      },
      {
        kind: 'submenu',
        path: [1],
        label: 'Disabled',
        enabled: false,
        items: [
          {
            kind: 'action',
            path: [1, 0],
            label: 'Inside',
            accelerator: null,
            enabled: true,
            checked: undefined,
          },
        ],
      },
    ]);
  });

  test('describes no item without an application menu', () => {
    vi.mocked(Menu.getApplicationMenu).mockReturnValueOnce(null);

    expect(invoke(TITLE_BAR_CHANNEL.GET_MENU, undefined)).toEqual([]);
  });
});

describe('click menu item', () => {
  test('clicks the item at the path, in the window that asked', () => {
    invoke(TITLE_BAR_CHANNEL.CLICK_MENU_ITEM, [0, 4]);

    expect(togglePath.click).toHaveBeenCalledWith(undefined, window, sender);
    expect(settings.click).not.toHaveBeenCalled();
  });

  test.each([
    ['a disabled item', [0, 3]],
    ['an item under a disabled submenu', [1, 0]],
    ['a submenu', [0]],
    ['a hidden item', [0, 2]],
    ['a path past the menu', [0, 9]],
    ['a path through an item with no submenu', [0, 0, 1]],
  ])('does nothing on %s', (_label, path) => {
    invoke(TITLE_BAR_CHANNEL.CLICK_MENU_ITEM, path);

    for (const item of [settings, sqlPanel, togglePath, fileMenu]) {
      expect(item.click).not.toHaveBeenCalled();
    }
  });

  test.each([
    ['nothing', undefined],
    ['an empty path', []],
    ['a negative index', [-1]],
    ['an index that is not an integer', [0.5]],
    ['an index that is not a number', ['0']],
  ])('refuses %s', (_label, path) => {
    expect(() => invoke(TITLE_BAR_CHANNEL.CLICK_MENU_ITEM, path)).toThrow(
      z.ZodError
    );
  });
});
