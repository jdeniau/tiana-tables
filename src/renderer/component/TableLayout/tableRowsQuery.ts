import { infiniteQueryOptions } from '@tanstack/react-query';
import type { Dialect } from '../../../sql/dialect/types';
import type { ResultField } from '../../../sql/resultField';
import type { ResultRow } from '../../../sql/types';
import { queryKeys } from '../../queryKeys';
import { TablePage, buildTableQuery } from './tableQuery';

const DEFAULT_LIMIT = 100;

/** kept this long once no page shows the table */
const TABLE_ROWS_GC_TIME = 30 * 60 * 1000;

/** the page does not fetch again the rows its loader fetched while slower loaders ran */
const TABLE_ROWS_STALE_TIME = 5 * 1000;

/** one page as the server answered it: its rows and its columns */
export type TableRowsPage = [ResultRow[], ResultField[]];

/** the rows of a table, one page per "load more": started by the route loader, read by `useTableRows` */
export function tableRowsQuery(
  dialect: Dialect,
  connectionSlug: string,
  page: Omit<TablePage, 'limit' | 'offset'>
) {
  const queryAt = (offset: number) =>
    buildTableQuery(dialect, { ...page, limit: DEFAULT_LIMIT, offset });

  return infiniteQueryOptions({
    queryKey: queryKeys.tableRows(
      connectionSlug,
      page.database,
      page.tableName,
      queryAt(0)
    ),
    queryFn: ({ pageParam }): Promise<TableRowsPage> =>
      window.sql.executeQuery<ResultRow[]>(queryAt(pageParam)),
    initialPageParam: 0,
    getNextPageParam: (_lastPage, pages) => pages.length * DEFAULT_LIMIT,
    gcTime: TABLE_ROWS_GC_TIME,
    staleTime: TABLE_ROWS_STALE_TIME,
  });
}
