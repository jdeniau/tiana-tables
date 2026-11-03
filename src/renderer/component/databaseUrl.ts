import { generatePath } from 'react-router';
import { getDatabaseAppState } from '../../configuration/appState';
import { Configuration } from '../../configuration/type';

/** The pages of a database: the `id` of each one's route, and the `activePathKey` it is stored as. */
export enum DatabasePage {
  Database = 'Database',
  Table = 'Table',
  TableStructure = 'TableStructure',
  Sql = 'Sql',
}

const DATABASE_PAGE_PATH: Record<DatabasePage, string> = {
  [DatabasePage.Database]: ':databaseName',
  [DatabasePage.Table]: ':databaseName/tables/:tableName',
  [DatabasePage.TableStructure]: ':databaseName/tables/:tableName/structure',
  [DatabasePage.Sql]: ':databaseName/sql',
};

/** The page a route id or a stored key names, if it names one. */
export function toDatabasePage(key: unknown): DatabasePage | undefined {
  return Object.values(DatabasePage).find((page) => page === key);
}

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
 * Where entering a database lands: the page it was left on, its last table, or the database itself.
 * Straight to the page: the database's index route would load it twice.
 */
export function databaseUrl(
  configuration: Configuration,
  connectionSlug: string,
  databaseName: string
): string {
  const appState = getDatabaseAppState(
    configuration,
    connectionSlug,
    databaseName
  );
  const path =
    DATABASE_PAGE_PATH[
      toDatabasePage(appState?.activePathKey) ?? DatabasePage.Table
    ];
  const tableName = appState?.activeTable;

  // a page of a table, in a database with no last table
  if (path.includes(':tableName') && !tableName) {
    return `/connections/${connectionSlug}/${databaseName}`;
  }

  return `/connections/${connectionSlug}/${generatePath(path, { databaseName, tableName })}`;
}
