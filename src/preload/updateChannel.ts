export enum UPDATE_CHANNEL {
  CHECK = 'update:check',
  RESTART = 'update:restart',
  /** main to renderer: the auto-updater changed what there is to show */
  STATUS_CHANGED = 'update:status-changed',
}
