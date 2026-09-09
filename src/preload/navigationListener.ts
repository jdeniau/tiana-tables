import { IpcRendererEvent, ipcRenderer } from 'electron';

type OnNavigateCallback = (path: string) => void;

/**
 * Every listener hands back the way to remove itself.
 *
 * `ipcRenderer.on` has no counterpart the renderer can reach — `off` needs the
 * very listener reference, which does not survive the context bridge — so
 * without this a subscribing component could never clean up, and every remount
 * left one more live callback bound to an unmounted tree.
 */
type Unsubscribe = () => void;

type NavigationListener = {
  onNavigate: (callback: OnNavigateCallback) => Unsubscribe;
  onOpenNavigationPanel: (callback: () => void) => Unsubscribe;
  onOpenSettings: (callback: () => void) => Unsubscribe;
  onPathBarVisibilityChange: (
    callback: (showPath: boolean) => void
  ) => Unsubscribe;
};

function subscribe(
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

export const navigationListener: NavigationListener = {
  onNavigate: (callback) => subscribe('navigate', callback),

  onOpenNavigationPanel: (callback) =>
    subscribe('openNavigationPanel', callback),

  onOpenSettings: (callback) => subscribe('openSettings', callback),

  onPathBarVisibilityChange: (callback) =>
    subscribe('pathBarVisibilityChange', callback),
};
