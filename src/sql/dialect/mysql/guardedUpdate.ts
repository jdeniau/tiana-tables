import invariant from 'tiny-invariant';
import { z } from 'zod';
import { isWriteResult } from '../../types';
import {
  ConflictReason,
  type UpdateCellRequest,
  UpdateCellStatus,
} from '../../updateCell';
import { primaryKeyClause } from '../primaryKeyClause';
import { type BuiltQuery, readQuery } from '../readQuery';
import type { GuardedUpdate } from '../types';
import { escapeIdentifier } from './escapeIdentifier';

function qualifiedTable({
  database,
  table,
}: Pick<UpdateCellRequest, 'database' | 'table'>): string {
  return `${escapeIdentifier(database)}.${escapeIdentifier(table)}`;
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
 * doesn't, the statement matches nothing and the read-back finds out why
 * (see `buildReadBack`). `force` drops that term, which is what the
 * user asks for when they choose to overwrite a reported conflict.
 *
 * `LIMIT 1` bounds the blast radius: the primary key should already match a
 * single row, and if it doesn't (an incomplete key list) one wrong row is a
 * far smaller accident than a whole table.
 */
function buildWrite(request: UpdateCellRequest): BuiltQuery {
  const { column, newValue, originalValue, isJsonColumn, force } = request;
  const escapedColumn = escapeIdentifier(column);
  const primaryKeyPart = primaryKeyClause(request.primaryKey, escapeIdentifier);

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
function buildReadBack(request: UpdateCellRequest): BuiltQuery {
  const escapedColumn = escapeIdentifier(request.column);
  const primaryKeyPart = primaryKeyClause(request.primaryKey, escapeIdentifier);

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

const cellReadRow = z.object({ value: z.unknown(), guardMatches: z.number() });

/**
 * The edited cell as read back after the write:
 * its value, and whether the guard still holds.
 */
interface CellRead {
  value: unknown;
  guardMatches: boolean;
}

export function mysqlGuardedUpdate(
  request: UpdateCellRequest
): GuardedUpdate<CellRead | undefined> {
  return {
    write: buildWrite(request),

    // the value to display is the server's, never the string the editor sent
    outcomeOfWrite: () => undefined,

    readBack: readQuery('readBack', {
      ...buildReadBack(request),
      row: cellReadRow,
      read: ([row]) =>
        row && { value: row.value, guardMatches: row.guardMatches === 1 },
    }),

    outcomeOfReadBack: (written, read) => {
      invariant(isWriteResult(written), 'An UPDATE answers a write summary');

      if (!read) {
        return {
          status: UpdateCellStatus.Conflict,
          reason: ConflictReason.Deleted,
        };
      }

      // MySQL counts *changed* rows in `affectedRows`, so writing the value a
      // cell already held reports 0 — indistinguishable, on its own, from a
      // guard that did not match. `guardMatches` tells the two apart: the server
      // computed it with the very same `<=>` comparison as the guard, which a
      // comparison redone in JavaScript could not promise. A forced write has no
      // guard to speak of, so the row being there is all there is to check.
      if (request.force || written.affectedRows > 0 || read.guardMatches) {
        return { status: UpdateCellStatus.Updated, value: read.value };
      }

      return {
        status: UpdateCellStatus.Conflict,
        reason: ConflictReason.Changed,
        currentValue: read.value,
      };
    },
  };
}
