import { clipboard } from 'electron';
import { CLIPBOARD_CHANNEL } from '../preload/clipboardChannel';

/**
 * The system clipboard, read from the main process.
 *
 * `navigator.clipboard.readText()` would look simpler, but it depends on a
 * Chromium permission and on the document holding the focus, and Electron's
 * sandboxed preload — the default since Electron 20 — does not expose the
 * `clipboard` module to it either. Going through the main process is the only
 * form that answers the same way in dev and in a packaged build.
 *
 * Asynchronous since Electron 44: the module was realigned on the W3C
 * Clipboard API, whose reads are promises. The renderer already awaited this
 * channel, so nothing changes on its side.
 */
function readText(): Promise<string> {
  return clipboard.readText();
}

const IPC_EVENT_BINDING = {
  [CLIPBOARD_CHANNEL.READ_TEXT]: readText,
} as const;

export function bindIpcMainClipboard(ipcMain: Electron.IpcMain): void {
  for (const [channel, handler] of Object.entries(IPC_EVENT_BINDING)) {
    ipcMain.handle(channel, () => handler());
  }
}
