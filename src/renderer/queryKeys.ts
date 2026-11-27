import type { SelectLabelsRequest } from '../sql/selectLabels';
import type { SelectRowRequest } from '../sql/selectRow';

/** The keys of the query cache, the connection first so that closing it removes all of its entries. */
export const queryKeys = {
  connection: (connectionSlug: string) => [connectionSlug] as const,

  /** keyed by the SQL of the first page, which holds everything the rows depend on */
  tableRows: (
    connectionSlug: string,
    database: string,
    tableName: string,
    firstPageSql: string
  ) =>
    [connectionSlug, database, 'tableRows', tableName, firstPageSql] as const,

  /** the row a foreign key points at, previewed while its value is edited */
  linkedRow: (connectionSlug: string, request: SelectRowRequest | null) =>
    [connectionSlug, request?.database ?? '', 'linkedRow', request] as const,

  /** every label of a database: a write to one of its rows can rename what a key points at */
  databaseForeignKeyLabels: (connectionSlug: string, database: string) =>
    [connectionSlug, database, 'foreignKeyLabels'] as const,

  /** the labels of the rows some foreign keys of a grid point at */
  foreignKeyLabels: (connectionSlug: string, request: SelectLabelsRequest) =>
    [
      ...queryKeys.databaseForeignKeyLabels(connectionSlug, request.database),
      request,
    ] as const,

  /** what the editor learnt from the statements run on a database */
  queryHistory: (connectionSlug: string, database: string) =>
    [connectionSlug, database, 'queryHistory'] as const,

  /** the texts run on a database since its history last loaded, most recent first: written by the SQL page's action, never fetched */
  recentRuns: (connectionSlug: string, database: string) =>
    [connectionSlug, database, 'recentRuns'] as const,

  /** the last run of the SQL page: written by its action, never fetched */
  sqlResult: (connectionSlug: string, database: string) =>
    [connectionSlug, database, 'sqlResult'] as const,
};
