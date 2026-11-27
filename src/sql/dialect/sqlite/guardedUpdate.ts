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

const cellRow = z.object({ value: z.unknown() });

/**
 * The guarded write, which answers the written cell through `RETURNING`, as on PostgreSQL.
 * `IS` is SQLite's null-safe equality; JSON is text here, compared as written.
 */
export function sqliteGuardedUpdate(
  request: UpdateCellRequest
): GuardedUpdate<{ value: unknown } | undefined> {
  const { column, force } = request;
  const table = `${escapeIdentifier(request.database)}.${escapeIdentifier(request.table)}`;
  const escapedColumn = escapeIdentifier(column);
  const primaryKeyPart = primaryKeyClause(request.primaryKey, escapeIdentifier);

  const guard = force ? null : `${escapedColumn} IS :originalValue`;

  return {
    // the new value is bound as text, which the column's affinity converts: `'2.5'` is stored as a number in a NUMERIC column
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
