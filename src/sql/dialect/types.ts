/**
 * The SQL text that differs from one server to another.
 *
 * No driver import belongs here: the renderer builds SQL of its own, so it
 * loads this too.
 */
export interface Dialect {
  /** Quote one identifier; the caller assembles the qualification itself. */
  escapeIdentifier(identifier: string): string;

  /** A table named by its database: `` `db`.`t` `` on MySQL. */
  qualify(databaseName: string, tableName: string): string;

  /** The statement making unqualified names resolve in `databaseName`. */
  useDatabase(databaseName: string): string;

  /** Quote a string so it reads as one value, whatever it holds. */
  escapeLiteral(text: string): string;

  /** How this server spells a boolean in a comparison. */
  booleanLiteral(value: boolean): string;
}
