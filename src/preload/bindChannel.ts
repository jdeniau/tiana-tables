import { IpcRendererEvent, ipcRenderer } from 'electron';

export function bindChannel(channel: string) {
  return function (...args: unknown[]) {
    return ipcRenderer.invoke(channel, ...args);
  };
}

export function bindEvent(channel: string) {
  return function (...args: unknown[]) {
    return ipcRenderer.send(channel, ...args);
  };
}

/**
 * Every listener hands back the way to remove itself.
 *
 * `ipcRenderer.on` has no counterpart the renderer can reach — `off` needs the
 * very listener reference, which does not survive the context bridge — so
 * without this a subscribing component could never clean up, and every remount
 * left one more live callback bound to an unmounted tree.
 */
export type Unsubscribe = () => void;

export function subscribe(
  channel: string,
  callback: (...args: never[]) => void
): Unsubscribe {
  const listener = (_event: IpcRendererEvent, ...args: unknown[]) => {
    (callback as (...args: unknown[]) => void)(...args);
  };

  ipcRenderer.on(channel, listener);

  return () => {
    ipcRenderer.off(channel, listener);
  };
}
