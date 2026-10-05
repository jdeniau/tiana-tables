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
