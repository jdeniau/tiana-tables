import { ipcRenderer } from 'electron';

type OnNavigateCallback = (path: string) => void;

type NavigationListener = {
  onNavigate: (callback: OnNavigateCallback) => void;
  onOpenNavigationPanel: (callback: () => void) => void;
};

export const navigationListener: NavigationListener = {
  onNavigate: (callback) =>
    ipcRenderer.on('navigate', (_event, value) => callback(value)),

  onOpenNavigationPanel: (callback) =>
    ipcRenderer.on('openNavigationPanel', callback),
};
