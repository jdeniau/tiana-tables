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
import { useDateDisplay } from '../../contexts/DateDisplayContext';
import { useForeignKeysContext } from '../../contexts/ForeignKeysContext';
import type { SelectLabelsRequest } from '../../sql/selectLabels';
import type { ResultRow } from '../../sql/types';
import { queryKeys } from '../queryKeys';
import { formatDateText, isDateKind } from '../utils/dateFormatter';
import {
  TABLE_ROWS_GC_TIME,
  TABLE_ROWS_PAGE_SIZE,
  TABLE_ROWS_STALE_TIME,
} from './TableLayout/tableRowsQuery';
import {
  type ColumnLabels,
  type GridColumn,
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

/** Several answers for one label column as one, `undefined` for none. */
function mergeLabels(
  answers: ReadonlyArray<ColumnLabels>
): ColumnLabels | undefined {
  const [first] = answers;

  return (
    first && {
      kind: first.kind,
      byKey: Object.assign({}, ...answers.map(({ byKey }) => byKey)),
    }
  );
}

/** Every label already answered for the column the request reads, whichever rows asked for it. */
function knownLabels(
  queryClient: QueryClient,
  connectionSlug: string,
  request: SelectLabelsRequest
): ColumnLabels | undefined {
  const source = labelSource(request);

  return mergeLabels(
    queryClient
      .getQueriesData<ColumnLabels>({
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
    queryFn: async (): Promise<ColumnLabels> => {
      const { kind, labels } = await window.sql.selectLabels(request);

      return { kind, byKey: labelsByKey(labels) };
    },
    // a key edited in a page keeps the labels of the others on screen while the page is asked again
    placeholderData: () => knownLabels(queryClient, connectionSlug, request),
    gcTime: TABLE_ROWS_GC_TIME,
    staleTime: TABLE_ROWS_STALE_TIME,
  });
}

// declared once, so that TanStack hands the same array back until an answer changes
function answersOf(
  results: Array<QueryObserverResult<ColumnLabels>>
): Array<ColumnLabels | undefined> {
  return results.map(({ data }) => data);
}

/**
 * The label each column of the grid shows after its value, by column id: the row a foreign key points at, named by one of its columns.
 * Two statements per key and per page of the table; nothing is asked without `displayAfterByTable`.
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
  const { shift } = useDateDisplay();

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
      const labels = mergeLabels(
        requestHashesOfKey[keyIndex].flatMap(
          (hash) => answers[hashes.indexOf(hash)] ?? []
        )
      );
      const labelOf: LabelOf = (row) => {
        const label =
          labels &&
          findLabel(labels.byKey, columnValue(row, key.column, rowsAsArray));

        // a date follows the date switch, as its cell does, without the offset a label has no room for
        return labels && label !== undefined && isDateKind(labels.kind)
          ? formatDateText(label, labels.kind, shift).text
          : label;
      };

      return [key.column.id, labelOf];
    })
  );
}
