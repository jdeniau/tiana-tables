import type { ResultRow } from '../../sql/types';
import type { PrimaryKeyPart } from '../../sql/updateCell';

/** The id a grid selects a row by: its primary key, or its position without one. */
export function rowIdOf(
  row: ResultRow,
  index: number,
  primaryKeys: ReadonlyArray<string> | undefined
): string {
  if (primaryKeys && primaryKeys.length > 0) {
    return primaryKeys.map((pk) => String(row[pk])).join('-');
  }

  return String(index);
}

/** A scalar the driver answers with, and binds back unchanged: a date is the server's text. */
function isPrimaryKeyValue(value: unknown): value is PrimaryKeyPart['value'] {
  return typeof value === 'string' || typeof value === 'number';
}

/**
 * The primary key the row is written and deleted by, or `null` when nothing identifies it.
 *
 * A key part that is not a scalar — a `BINARY` column, arriving as bytes —
 * gives up the whole key: the row reads as read-only rather than being written
 * or deleted against a value reshaped on the way out.
 */
export function buildRowKey(
  row: ResultRow,
  primaryKeys: Array<string> | undefined
): Array<PrimaryKeyPart> | null {
  if (!primaryKeys || primaryKeys.length === 0) {
    return null;
  }

  const parts: Array<PrimaryKeyPart> = [];

  for (const column of primaryKeys) {
    const value = row[column];

    if (!isPrimaryKeyValue(value)) {
      return null;
    }

    parts.push({ column, value });
  }

  return parts;
}
