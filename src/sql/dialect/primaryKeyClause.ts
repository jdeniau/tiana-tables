import invariant from 'tiny-invariant';
import type { UpdateCellRequest } from '../updateCell';
import type { BuiltQuery } from './readQuery';

/**
 * The parameter that carries one part of a primary key.
 *
 * Numbered rather than named after the column: a column name is not
 * necessarily a valid parameter name — the rewriter only reads
 * `[a-zA-Z][a-zA-Z0-9_]*` after the colon — and could collide with the
 * `newValue` and `originalValue` of the write.
 */
function primaryKeyParameter(index: number): string {
  return `primaryKey${index}`;
}

/**
 * The `WHERE` that targets exactly one row.
 *
 * Plain `=`, and not the null-safe comparison of the guard: both engines force
 * `NOT NULL` on every column of a `PRIMARY KEY`, and it is the primary key the
 * dialects read, never a unique index that could hold one. A null-safe
 * comparison here would only invite the reader to wonder when a key is `NULL`.
 */
export function primaryKeyClause(
  primaryKey: UpdateCellRequest['primaryKey'],
  escapeIdentifier: (identifier: string) => string
): BuiltQuery {
  invariant(
    primaryKey.length > 0,
    'A cell can only be updated on a row identified by a primary key'
  );

  return {
    sql: primaryKey
      .map(
        (part, index) =>
          `${escapeIdentifier(part.column)} = :${primaryKeyParameter(index)}`
      )
      .join(' AND '),
    values: Object.fromEntries(
      primaryKey.map((part, index) => [primaryKeyParameter(index), part.value])
    ),
  };
}
