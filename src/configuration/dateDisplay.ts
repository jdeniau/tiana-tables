/** The zone the grid shows a date-time in. */
export enum DateDisplay {
  /** as the server wrote it, in the zone of its session */
  Server = 'server',
  Utc = 'utc',
  /** in the zone of the machine */
  Local = 'local',
}
