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

  /** the last run of the SQL page: written by its action, never fetched */
  sqlResult: (connectionSlug: string, database: string) =>
    [connectionSlug, database, 'sqlResult'] as const,
};
