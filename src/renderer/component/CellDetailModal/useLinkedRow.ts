import {
  keepPreviousData,
  queryOptions,
  skipToken,
  useQuery,
} from '@tanstack/react-query';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useForeignKeysContext } from '../../../contexts/ForeignKeysContext';
import type { WholeForeignKey } from '../../../sql/ForeignKeysHelper';
import { type ErrorLike, isErrorLike } from '../../../sql/errorSerializer';
import type { ResultField } from '../../../sql/resultField';
import type { SelectRowRequest } from '../../../sql/selectRow';
import type { ResultRow } from '../../../sql/types';
import type { PrimaryKeyPart } from '../../../sql/updateCell';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { queryKeys } from '../../queryKeys';
import type { EditableValue } from '../CellEditor/editableValue';
import { linkedRowKey } from './linkedRow';
import type { CellDetail } from './types';

/** past this pause in the typing, the draft is looked up */
const LOOKUP_DELAY_MS = 300;

/** the row a key points at, kept on screen while the next key is looked up */
function linkedRowQuery(
  connectionSlug: string | null,
  request: SelectRowRequest | null
) {
  return queryOptions({
    queryKey: queryKeys.linkedRow(connectionSlug ?? '', request),
    queryFn:
      connectionSlug !== null && request
        ? () => window.sql.selectRow(request)
        : skipToken,
    placeholderData: keepPreviousData,
  });
}

/** The row the edited foreign key points at, as the card shows it. */
export interface LinkedRow {
  /** the key the edited column belongs to, every column of it */
  foreignKey: WholeForeignKey;
  /** the referenced columns with the values the draft gives them */
  key: Array<PrimaryKeyPart>;
  /** the draft has not been answered yet: still typed, or its query in flight */
  isSearching: boolean;
  /** the columns of the last answer, the previous key's while `key` is looked up */
  fields: Array<ResultField> | undefined;
  /** the row `key` points at, `null` when none holds it, `undefined` until answered */
  row: ResultRow | null | undefined;
  error: ErrorLike | null;
}

/**
 * The row the draft of a foreign key points at,
 * `null` when the cell cannot be edited, is no key, or its draft points nowhere.
 */
export function useLinkedRow(
  detail: CellDetail,
  edited: EditableValue,
  isEditable: boolean
): LinkedRow | null {
  const { currentConnectionSlug } = useConnectionContext();
  const foreignKeys = useForeignKeysContext();
  // the draft is a state: its identity changes only when the user types
  const settled = useDebouncedValue(edited, LOOKUP_DELAY_MS);

  const { column, rowByColumn } = detail;
  const foreignKey =
    isEditable && column.tableName
      ? foreignKeys.getWholeForeignKey(column.tableName, column.name)
      : null;
  const keyOf = (draft: EditableValue) =>
    foreignKey &&
    linkedRowKey(foreignKey, column.name, draft, column.kind, rowByColumn);
  const key = keyOf(edited);
  const settledKey = keyOf(settled);

  const query = useQuery(
    linkedRowQuery(
      currentConnectionSlug,
      foreignKey &&
        settledKey && {
          database: foreignKey.referencedDatabase,
          table: foreignKey.referencedTable,
          key: settledKey,
        }
    )
  );

  if (!foreignKey || !key) {
    return null;
  }

  const isSearching =
    settled !== edited || query.isPending || query.isPlaceholderData;

  return {
    foreignKey,
    key,
    isSearching,
    fields: query.data?.fields,
    row: isSearching ? undefined : query.data?.row,
    error: !isSearching && isErrorLike(query.error) ? query.error : null,
  };
}
