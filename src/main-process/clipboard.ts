import { clipboard, nativeImage } from 'electron';
import { CLIPBOARD_CHANNEL } from '../preload/clipboardChannel';

/**
 * The system clipboard, read from the main process.
 *
 * `navigator.clipboard.readText()` would look simpler, but it depends on a
 * Chromium permission and on the document holding the focus, and Electron's
 * sandboxed preload — the default since Electron 20 — does not expose the
 * `clipboard` module to it either. Going through the main process is the only
 * form that answers the same way in dev and in a packaged build.
 */
function readText(): string {
  return clipboard.readText();
}

/**
 * An image on the clipboard is a `NativeImage`: writing the data URL as text
 * would paste the base64 string instead of the picture.
 */
function writeImage(dataUrl: string): void {
  clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));
}

const IPC_EVENT_BINDING = {
  [CLIPBOARD_CHANNEL.READ_TEXT]: readText,
  [CLIPBOARD_CHANNEL.WRITE_IMAGE]: writeImage,
} as const;

export function bindIpcMainClipboard(ipcMain: Electron.IpcMain): void {
  for (const [channel, handler] of Object.entries(IPC_EVENT_BINDING)) {
    ipcMain.handle(channel, (event, ...args: unknown[]) =>
      // the first argument is the event, which no handler takes
      // @ts-expect-error issue with strict type in tsconfig, but works at runtime
      handler(...args)
    );
  }
}
