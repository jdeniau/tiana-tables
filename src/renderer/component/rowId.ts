import type { ResultRow } from '../../sql/types';

/** The id a grid selects a row by: its primary key, or its position without one. */
export function rowIdOf(
  row: ResultRow,
  index: number,
  primaryKeys: ReadonlyArray<string> | undefined
): string {
  return primaryKeys && primaryKeys.length > 0
    ? primaryKeys.map((pk) => String(row[pk])).join('-')
    : String(index);
}
