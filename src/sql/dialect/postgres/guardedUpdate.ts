import { z } from 'zod';
import {
  ConflictReason,
  type UpdateCellRequest,
  UpdateCellStatus,
} from '../../updateCell';
import { primaryKeyClause } from '../primaryKeyClause';
import { readQuery } from '../readQuery';
import type { GuardedUpdate } from '../types';
import { escapeIdentifier } from './escape';

/**
 * What the guard compares. A JSON column is compared as `jsonb` on both sides:
 * `json` has no equality operator at all, and `jsonb` ignores key order and spacing.
 * `CAST` and not `::jsonb`, which the placeholder rewriter would read as `:jsonb`.
 */
function compared(expression: string, isJsonColumn: boolean | undefined) {
  return isJsonColumn ? `CAST(${expression} AS jsonb)` : expression;
}

const cellRow = z.object({ value: z.unknown() });

/**
 * The guarded write, which answers the written cell through `RETURNING`.
 *
 * A write that matched settles the edit in one query.
 * One that matched nothing is read back, to tell a changed row from a deleted one.
 * No bound on the `UPDATE`, which PostgreSQL has no syntax for: the primary key targets one row.
 */
export function postgresGuardedUpdate(
  request: UpdateCellRequest
): GuardedUpdate<{ value: unknown } | undefined> {
  const { column, isJsonColumn, force } = request;
  const table = `${escapeIdentifier(request.database)}.${escapeIdentifier(request.table)}`;
  const escapedColumn = escapeIdentifier(column);
  const primaryKeyPart = primaryKeyClause(request.primaryKey, escapeIdentifier);

  const guard = force
    ? null
    : `${compared(escapedColumn, isJsonColumn)} IS NOT DISTINCT FROM ${compared(':originalValue', isJsonColumn)}`;

  return {
    // the new value is bound untyped, so the server parses it as the column's type
    write: {
      sql: [
        `UPDATE ${table}`,
        `SET ${escapedColumn} = :newValue`,
        `WHERE ${primaryKeyPart.sql}${guard ? ` AND ${guard}` : ''}`,
        `RETURNING ${escapedColumn} AS value`,
      ].join(' '),
      values: {
        newValue: request.newValue,
        ...primaryKeyPart.values,
        ...(guard ? { originalValue: request.originalValue } : {}),
      },
    },

    // a write summary instead of rows fails the parse: `RETURNING` answers rows
    outcomeOfWrite: (written) => {
      const [row] = z.array(cellRow).parse(written);

      return row && { status: UpdateCellStatus.Updated, value: row.value };
    },

    readBack: readQuery('readBack', {
      sql: [
        `SELECT ${escapedColumn} AS value`,
        `FROM ${table}`,
        `WHERE ${primaryKeyPart.sql}`,
      ].join(' '),
      values: primaryKeyPart.values,
      row: cellRow,
      read: ([row]) => row,
    }),

    // the write matched nothing: the row is gone, or its cell holds something else
    outcomeOfReadBack: (_written, read) =>
      read
        ? {
            status: UpdateCellStatus.Conflict,
            reason: ConflictReason.Changed,
            currentValue: read.value,
          }
        : { status: UpdateCellStatus.Conflict, reason: ConflictReason.Deleted },
  };
}
