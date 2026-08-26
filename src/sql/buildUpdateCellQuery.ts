import invariant from 'tiny-invariant';
import { escapeIdentifier } from './escapeIdentifier';
import type { SqlBoundValues } from './types';
import type { UpdateCellRequest } from './updateCell';

export interface BuiltQuery {
  sql: string;
  values: SqlBoundValues;
}

function qualifiedTable({
  database,
  table,
}: Pick<UpdateCellRequest, 'database' | 'table'>): string {
  return `${escapeIdentifier(database)}.${escapeIdentifier(table)}`;
}

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
 * Plain `=`, and not the null-safe `<=>` used by the guard below: MySQL forces
 * `NOT NULL` on every column of a `PRIMARY KEY`, and it is the `PRIMARY` key we
 * read (`SHOW KEYS … WHERE Key_name = 'PRIMARY'`), never a unique index that
 * could hold one. A null-safe comparison here would only invite the reader to
 * wonder when a key is `NULL`.
 */
function primaryKeyClause(primaryKey: UpdateCellRequest['primaryKey']): {
  sql: string;
  values: SqlBoundValues;
} {
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

/**
 * The value expression of a placeholder. A JSON column goes through
 * `CAST(? AS JSON)` so that both the write and the guard talk JSON: comparing
 * a JSON column against a text literal would depend on key order and spacing,
 * and would report a conflict on every edit of a re-serialized object.
 */
function valueExpression(
  parameter: string,
  isJsonColumn: boolean | undefined
): string {
  return isJsonColumn ? `CAST(:${parameter} AS JSON)` : `:${parameter}`;
}

/**
 * The guarded write.
 *
 * Optimistic concurrency lives in the last term of the `WHERE`: the cell is
 * only written if it still holds the value the row was loaded with. When it
 * doesn't, the statement matches nothing and `updateCell` goes on to find out
 * why (see `buildReadCellQuery`). `force` drops that term, which is what the
 * user asks for when they choose to overwrite a reported conflict.
 *
 * `LIMIT 1` bounds the blast radius: the primary key should already match a
 * single row, and if it doesn't (an incomplete key list) one wrong row is a
 * far smaller accident than a whole table.
 */
export function buildUpdateCellQuery(request: UpdateCellRequest): BuiltQuery {
  const { column, newValue, originalValue, isJsonColumn, force } = request;
  const escapedColumn = escapeIdentifier(column);
  const primaryKeyPart = primaryKeyClause(request.primaryKey);

  const guard = force
    ? null
    : `${escapedColumn} <=> ${valueExpression('originalValue', isJsonColumn)}`;

  const sql = [
    `UPDATE ${qualifiedTable(request)}`,
    `SET ${escapedColumn} = ${valueExpression('newValue', isJsonColumn)}`,
    `WHERE ${primaryKeyPart.sql}${guard ? ` AND ${guard}` : ''}`,
    'LIMIT 1',
  ].join(' ');

  // A forced write has no guard, hence no `originalValue` to bind. The object
  // holds exactly what the statement names: an unused parameter would be
  // ignored in silence, and so would a misspelled one.
  return {
    sql,
    values: {
      newValue,
      ...primaryKeyPart.values,
      ...(guard ? { originalValue } : {}),
    },
  };
}

/**
 * Read the cell back after a write, and ask the server whether the guard would
 * still match.
 *
 * Two things are needed once the `UPDATE` has run, and one query answers both:
 * the value to display (the server, not the editor, decides what a `DATETIME`
 * or a `DECIMAL` ends up holding), and whether a statement that matched
 * nothing did so because of a concurrent write. `guardMatches` is computed by
 * MySQL with the very same `<=>` comparison as the guard, so it never disagrees
 * with it the way a comparison redone in JavaScript would.
 */
export function buildReadCellQuery(request: UpdateCellRequest): BuiltQuery {
  const escapedColumn = escapeIdentifier(request.column);
  const primaryKeyPart = primaryKeyClause(request.primaryKey);

  const sql = [
    `SELECT ${escapedColumn} AS \`value\`,`,
    `(${escapedColumn} <=> ${valueExpression('originalValue', request.isJsonColumn)}) AS \`guardMatches\``,
    `FROM ${qualifiedTable(request)}`,
    `WHERE ${primaryKeyPart.sql}`,
    'LIMIT 1',
  ].join(' ');

  return {
    sql,
    values: { originalValue: request.originalValue, ...primaryKeyPart.values },
  };
}
