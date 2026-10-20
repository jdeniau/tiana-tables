import {
  InfiniteData,
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { ResultField } from '../../../sql/resultField';
import type { ResultRow } from '../../../sql/types';
import { useDialect } from '../../hooks/useDialect';
import { TablePage } from './tableQuery';
import { TableRowsPage, tableRowsQuery } from './tableRowsQuery';

interface TableRows {
  /** the pages loaded so far, `null` until the first one arrives and again after an error */
  result: null | ResultRow[];
  /** the columns of the last page, each tagged with this table */
  fields: null | ResultField[];
  /** the last fetch's error, cleared by the next one that succeeds */
  error: null | Error;
  /** the rows of this query are not there yet: the table's first page, or that of a new order */
  loading: boolean;
  /** the next page is on its way */
  loadingMore: boolean;
  /** fetches the next page and appends it to `result` */
  loadMore: () => void;
  /** writes the value the server answered into the row already loaded */
  updateValue: (rowIndex: number, columnName: string, value: unknown) => void;
}

/** the rows of a table, fetched one page at a time and kept in the query cache */
export function useTableRows(
  connectionSlug: string,
  page: Omit<TablePage, 'limit' | 'offset'>
): TableRows {
  const dialect = useDialect();
  const queryClient = useQueryClient();
  const rowsQuery = tableRowsQuery(dialect, connectionSlug, page);
  const {
    data,
    error,
    isPending,
    isPlaceholderData,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    ...rowsQuery,
    // the previous order's rows, under the skeleton, keep its headers to click
    placeholderData: keepPreviousData,
  });

  const lastPage = data?.pages.at(-1);

  // patched in place, not re-fetched: the value is the server's (see `updateCell`),
  // as fresh as a reload, without losing the rows loaded nor the scroll
  const updateValue = (
    rowIndex: number,
    columnName: string,
    value: unknown
  ) => {
    queryClient.setQueryData(
      rowsQuery.queryKey,
      (previous) => previous && patchRow(previous, rowIndex, columnName, value)
    );
  };

  return {
    // the cache keeps the pages of a failed fetch: they are not shown with its error
    result: error ? null : (data?.pages.flatMap(([rows]) => rows) ?? null),
    fields:
      lastPage?.[1].map((field) => ({ ...field, table: page.tableName })) ??
      null,
    error,
    loading: isPending || isPlaceholderData,
    loadingMore: isFetchingNextPage,
    loadMore: () => void fetchNextPage(),
    updateValue,
  };
}

/** the pages with one row replaced, `rowIndex` counted across all of them */
function patchRow(
  data: InfiniteData<TableRowsPage>,
  rowIndex: number,
  columnName: string,
  value: unknown
): InfiniteData<TableRowsPage> {
  let start = 0;

  const pages = data.pages.map((page): TableRowsPage => {
    const [rows, fields] = page;
    const index = rowIndex - start;

    start += rows.length;

    const row = rows[index];

    if (!row) {
      return page;
    }

    const next = [...rows];
    next[index] = { ...row, [columnName]: value };

    return [next, fields];
  });

  return { ...data, pages };
}

export const testables = { patchRow };
