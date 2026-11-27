/** The `code` the SQLite driver gives an error, where Node's `ERR_SQLITE_ERROR` tells nothing apart. */
export enum SqliteErrorCode {
  /** missing, a directory, or out of this account's reach: SQLite tells them apart no further */
  CannotOpen = 'SQLITE_CANTOPEN',
  NotADatabase = 'SQLITE_NOTADB',
  /** a text holding a second statement, which SQLite would leave out unrun */
  MultipleStatements = 'MULTIPLE_STATEMENTS',
}
