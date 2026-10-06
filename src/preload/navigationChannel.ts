export enum NAVIGATION_CHANNEL {
  /** main to renderer: a path to open, or a step in the history */
  NAVIGATE = 'navigation:navigate',
  /** main to renderer: Open navigation panel was chosen in the Navigate menu */
  OPEN_NAVIGATION_PANEL = 'navigation:open-navigation-panel',
  /** main to renderer: Next or Previous Connection was chosen in the Navigate menu, with the tabs to move by */
  CYCLE_CONNECTION = 'navigation:cycle-connection',
  /** main to renderer: Toggle path bar was checked or unchecked */
  PATH_BAR_VISIBILITY_CHANGE = 'navigation:path-bar-visibility-change',
}
