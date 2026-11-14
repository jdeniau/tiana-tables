import {
  type QueryClient,
  type QueryObserverResult,
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
  type GridColumn,
  type LabelsByKey,
  labelledKeys,
  labelsByKey,
  labelsRequest,
  rowKeyText,
} from './foreignKeyLabels';

/** the rows asked about in one statement: a page of the table view */
const ROWS_PER_REQUEST = 100;

/** kept as long as the rows they label */
const LABELS_GC_TIME = 30 * 60 * 1000;

/** asked again by a grid opened after this long, as its rows are */
const LABELS_STALE_TIME = 5 * 1000;

/** The label a row's key points at, `undefined` until it is known or when there is none. */
export type LabelOf = (row: ResultRow) => string | undefined;

/** what tells the labels of one column of one table from those of another */
function labelSource({
  table,
  labelColumn,
  keys,
}: SelectLabelsRequest): string {
  return JSON.stringify([
    table,
    labelColumn,
    keys[0].map(({ column }) => column),
  ]);
}

/** Every label already answered for the column the request reads, whichever rows asked for it. */
function knownLabels(
  queryClient: QueryClient,
  connectionSlug: string,
  request: SelectLabelsRequest
): LabelsByKey {
  const source = labelSource(request);
  const [connection, database, kind] = queryKeys.foreignKeyLabels(
    connectionSlug,
    request
  );

  return Object.assign(
    {},
    ...queryClient
      .getQueriesData<LabelsByKey>({ queryKey: [connection, database, kind] })
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
    gcTime: LABELS_GC_TIME,
    staleTime: LABELS_STALE_TIME,
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
 * One statement per key and per hundred rows; nothing is asked without `displayAfterByTable`.
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
    keys.length > 0 && rows && start < rows.length;
    start += ROWS_PER_REQUEST
  ) {
    chunks.push(rows.slice(start, start + ROWS_PER_REQUEST));
  }

  const requests = keys.flatMap((key, keyIndex) =>
    chunks.flatMap((chunk) => {
      const request = labelsRequest(chunk, key, rowsAsArray);

      return request ? [{ keyIndex, request }] : [];
    })
  );

  const answers = useQueries({
    queries: requests.map(({ request }) =>
      labelsQuery(queryClient, currentConnectionSlug ?? '', request)
    ),
    combine: answersOf,
  });

  return new Map(
    keys.map((key, keyIndex) => {
      const labels: LabelsByKey = Object.assign(
        {},
        ...requests.flatMap(({ keyIndex: index }, requestIndex) =>
          index === keyIndex ? [answers[requestIndex] ?? {}] : []
        )
      );
      const labelOf: LabelOf = (row) => {
        const text = rowKeyText(row, key, rowsAsArray);

        return text === null ? undefined : labels[text];
      };

      return [key.columnId, labelOf];
    })
  );
}
