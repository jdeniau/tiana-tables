import { clipboard } from 'electron';
import { CLIPBOARD_CHANNEL } from '../preload/clipboardChannel';

/**
 * The system clipboard, read and written from the main process.
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

async function writeText(text: unknown): Promise<void> {
  // the renderer is not trusted with the shape of what crosses the bridge
  if (typeof text !== 'string') {
    throw new TypeError('Only text can be written to the clipboard');
  }

  await clipboard.writeText(text);
}

const IPC_EVENT_BINDING = {
  [CLIPBOARD_CHANNEL.READ_TEXT]: readText,
  [CLIPBOARD_CHANNEL.WRITE_TEXT]: writeText,
} as const;

export function bindIpcMainClipboard(ipcMain: Electron.IpcMain): void {
  for (const [channel, handler] of Object.entries(IPC_EVENT_BINDING)) {
    ipcMain.handle(channel, (_event, ...args: [unknown]) => handler(...args));
  }
}
