import { Unsubscribe, subscribe } from './bindChannel';
import { NAVIGATION_CHANNEL } from './navigationChannel';

type OnNavigateCallback = (path: string) => void;

type NavigationListener = {
  onNavigate: (callback: OnNavigateCallback) => Unsubscribe;
  onOpenNavigationPanel: (callback: () => void) => Unsubscribe;
  /** `offset` is the number of connection tabs to move by, negative to the left */
  onCycleConnection: (callback: (offset: number) => void) => Unsubscribe;
  onPathBarVisibilityChange: (
    callback: (showPath: boolean) => void
  ) => Unsubscribe;
};

export const navigationListener: NavigationListener = {
  onNavigate: (callback) => subscribe('navigate', callback),

  onOpenNavigationPanel: (callback) =>
    subscribe('openNavigationPanel', callback),

  onCycleConnection: (callback) =>
    subscribe(NAVIGATION_CHANNEL.CYCLE_CONNECTION, callback),

  onPathBarVisibilityChange: (callback) =>
    subscribe('pathBarVisibilityChange', callback),
};
