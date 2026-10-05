import { getDatabaseAppState } from '../../configuration/appState';
import { Configuration } from '../../configuration/type';

/** The URL of the table last opened in a database, if it has one. */
export function lastTableUrl(
  configuration: Configuration,
  connectionSlug: string,
  databaseName: string
): string | undefined {
  const activeTable = getDatabaseAppState(
    configuration,
    connectionSlug,
    databaseName
  )?.activeTable;

  return activeTable
    ? `/connections/${connectionSlug}/${databaseName}/tables/${activeTable}`
    : undefined;
}

/**
 * Where entering a database lands: its last table, or the database itself.
 * Straight to the table: the database's index route would load it twice.
 */
export function databaseUrl(
  configuration: Configuration,
  connectionSlug: string,
  databaseName: string
): string {
  return (
    lastTableUrl(configuration, connectionSlug, databaseName) ??
    `/connections/${connectionSlug}/${databaseName}`
  );
}
