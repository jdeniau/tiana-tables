import { Unsubscribe, subscribe } from './bindChannel';

type OnNavigateCallback = (path: string) => void;

type NavigationListener = {
  onNavigate: (callback: OnNavigateCallback) => Unsubscribe;
  onOpenNavigationPanel: (callback: () => void) => Unsubscribe;
  onPathBarVisibilityChange: (
    callback: (showPath: boolean) => void
  ) => Unsubscribe;
};

export const navigationListener: NavigationListener = {
  onNavigate: (callback) => subscribe('navigate', callback),

  onOpenNavigationPanel: (callback) =>
    subscribe('openNavigationPanel', callback),

  onPathBarVisibilityChange: (callback) =>
    subscribe('pathBarVisibilityChange', callback),
};
