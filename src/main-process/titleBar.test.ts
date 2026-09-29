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
const menu = { popup: vi.fn() };
const sender = { getZoomFactor: vi.fn(() => 1) };

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

describe('open menu', () => {
  test('opens the application menu under the anchor', () => {
    invoke(TITLE_BAR_CHANNEL.OPEN_MENU, { x: 136.2, y: 28.6 });

    expect(menu.popup).toHaveBeenCalledWith({ window, x: 136, y: 29 });
  });

  test('turns CSS pixels into window pixels on a zoomed page', () => {
    sender.getZoomFactor.mockReturnValueOnce(1.5);

    invoke(TITLE_BAR_CHANNEL.OPEN_MENU, { x: 136.2, y: 28.6 });

    expect(menu.popup).toHaveBeenCalledWith({ window, x: 204, y: 43 });
  });

  test.each([
    ['nothing', undefined],
    ['an x alone', { x: 10 }],
    ['a coordinate that is not a number', { x: '10', y: 20 }],
    ['a NaN coordinate', { x: Number.NaN, y: 20 }],
    ['an infinite coordinate', { x: 10, y: Number.POSITIVE_INFINITY }],
  ])('refuses %s', (_label, anchor) => {
    expect(() => invoke(TITLE_BAR_CHANNEL.OPEN_MENU, anchor)).toThrow(
      z.ZodError
    );
    expect(menu.popup).not.toHaveBeenCalled();
  });
});
