/**
 * The server family a connection talks to: a driver and a dialect, not a product.
 *
 * MariaDB is `MySQL` here — same wire protocol, same driver, same quoting. What
 * does set the two apart (`JSON` is only a `LONGTEXT` alias on MariaDB) the
 * server declares itself, so it is never asked of the user.
 */
export enum DatabaseEngine {
  MySQL = 'mysql',
  PostgreSQL = 'postgresql',
  SQLite = 'sqlite',
}

/** The engines whose database is a file the app opens, with no server, user or password. */
export type FileEngine = DatabaseEngine.SQLite;

export type ServerEngine = Exclude<DatabaseEngine, FileEngine>;

const OPENS_FILE: Readonly<Record<DatabaseEngine, boolean>> = {
  [DatabaseEngine.MySQL]: false,
  [DatabaseEngine.PostgreSQL]: false,
  [DatabaseEngine.SQLite]: true,
};

export function isFileEngine(engine: DatabaseEngine): engine is FileEngine {
  return OPENS_FILE[engine];
}

/** Whether a connection opens a file, told from its engine alone. */
export function opensFile<Connection extends { engine: DatabaseEngine }>(
  connection: Connection
): connection is Extract<Connection, { engine: FileEngine }> {
  return isFileEngine(connection.engine);
}
