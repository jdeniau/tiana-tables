import {
  type QueryClient,
  type QueryObserverResult,
  hashKey,
  queryOptions,
  useQueries,
  useQueryClient,
} from '@tanstack/react-query';
import type { DisplayAfterByTable } from '../../configuration/columnOrder';
import { useAllColumnsContext } from '../../contexts/AllColumnsContext';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { useForeignKeysContext } from '../../contexts/ForeignKeysContext';
import type { SelectLabelsRequest } from '../../sql/selectLabels';
import type { ResultRow } from '../../sql/types';
import { queryKeys } from '../queryKeys';
import {
  TABLE_ROWS_GC_TIME,
  TABLE_ROWS_PAGE_SIZE,
  TABLE_ROWS_STALE_TIME,
} from './TableLayout/tableRowsQuery';
import {
  type GridColumn,
  type LabelsByKey,
  findLabel,
  labelledKeys,
  labelsByKey,
  labelsRequest,
} from './foreignKeyLabels';
import { columnValue } from './useGridCopy';

/** The label a row's key points at, `undefined` until it is known or when there is none. */
export type LabelOf = (row: ResultRow) => string | undefined;

/** what tells the labels of one column of one table from those of another */
function labelSource({
  table,
  keyColumn,
  labelColumn,
}: SelectLabelsRequest): string {
  return JSON.stringify([table, keyColumn, labelColumn]);
}

/** Every label already answered for the column the request reads, whichever rows asked for it. */
function knownLabels(
  queryClient: QueryClient,
  connectionSlug: string,
  request: SelectLabelsRequest
): LabelsByKey {
  const source = labelSource(request);

  return Object.assign(
    {},
    ...queryClient
      .getQueriesData<LabelsByKey>({
        queryKey: queryKeys.databaseForeignKeyLabels(
          connectionSlug,
          request.database
        ),
      })
      .flatMap(([queryKey, labels]) =>
        labels && labelSource(queryKey[3] as SelectLabelsRequest) === source
          ? [labels]
          : []
      )
  );
}

function labelsQuery(
  queryClient: QueryClient,
  connectionSlug: string,
  request: SelectLabelsRequest
) {
  return queryOptions({
    queryKey: queryKeys.foreignKeyLabels(connectionSlug, request),
    queryFn: async () => labelsByKey(await window.sql.selectLabels(request)),
    // a key edited in a page keeps the labels of the others on screen while the page is asked again
    placeholderData: () => knownLabels(queryClient, connectionSlug, request),
    gcTime: TABLE_ROWS_GC_TIME,
    staleTime: TABLE_ROWS_STALE_TIME,
  });
}

// declared once, so that TanStack hands the same array back until an answer changes
function answersOf(
  results: Array<QueryObserverResult<LabelsByKey>>
): Array<LabelsByKey | undefined> {
  return results.map(({ data }) => data);
}

/**
 * The label each column of the grid shows after its value, by column id: the row a foreign key points at, named by one of its columns.
 * One statement per key and per page of the table; nothing is asked without `displayAfterByTable`.
 */
export function useForeignKeyLabels(
  rows: ReadonlyArray<ResultRow> | null,
  columns: ReadonlyArray<GridColumn>,
  rowsAsArray: boolean,
  displayAfterByTable: DisplayAfterByTable | undefined
): Map<string, LabelOf> {
  const foreignKeys = useForeignKeysContext();
  const allColumns = useAllColumnsContext();
  const { database } = useDatabaseContext();
  const { currentConnectionSlug } = useConnectionContext();
  const queryClient = useQueryClient();

  const keys =
    displayAfterByTable && database && currentConnectionSlug
      ? labelledKeys(
          columns,
          foreignKeys,
          allColumns,
          database,
          (table) => displayAfterByTable[table]
        )
      : [];

  const chunks: Array<ReadonlyArray<ResultRow>> = [];

  for (
    let start = 0;
    rows && start < rows.length;
    start += TABLE_ROWS_PAGE_SIZE
  ) {
    chunks.push(rows.slice(start, start + TABLE_ROWS_PAGE_SIZE));
  }

  // pages holding the same keys share one query: `useQueries` warns on a duplicate
  const requests = new Map<string, SelectLabelsRequest>();
  const requestHashesOfKey = keys.map((key) =>
    chunks.flatMap((chunk) => {
      const request = labelsRequest(chunk, key, rowsAsArray);

      if (!request) {
        return [];
      }

      const hash = hashKey([request]);
      requests.set(hash, request);

      return [hash];
    })
  );
  const hashes = [...requests.keys()];

  const answers = useQueries({
    queries: [...requests.values()].map((request) =>
      labelsQuery(queryClient, currentConnectionSlug ?? '', request)
    ),
    combine: answersOf,
  });

  return new Map(
    keys.map((key, keyIndex) => {
      const labels: LabelsByKey = Object.assign(
        {},
        ...requestHashesOfKey[keyIndex].map(
          (hash) => answers[hashes.indexOf(hash)] ?? {}
        )
      );
      const labelOf: LabelOf = (row) =>
        findLabel(labels, columnValue(row, key.column, rowsAsArray));

      return [key.column.id, labelOf];
    })
  );
}
