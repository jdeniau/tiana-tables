import { ipcRenderer } from 'electron';

type OnNavigateCallback = (path: string) => void;

type NavigationListener = {
  onNavigate: (callback: OnNavigateCallback) => void;
};

export const navigationListener: NavigationListener = {
  onNavigate: (callback) =>
    ipcRenderer.on('navigate', (_event, value) => callback(value)),
};
