import { Types } from 'mysql'; // importing from mysql2 will import the commonjs package and will fail
import { DataType, readDataType } from '../../../sql/dataType';
import type { ColumnDetail } from '../../../sql/types';

/** Which editor a cell gets. */
export enum EditorKind {
  Enum = 'enum',
  Set = 'set',
  Date = 'date',
  DateTime = 'datetime',
  Number = 'number',
  Json = 'json',
  Text = 'text',
}

/**
 * The same groups `Cell.tsx` switches on to render a value, so that the editor
 * of a cell never disagrees with the way it was displayed.
 */
const NUMERIC_TYPES: ReadonlySet<number> = new Set([
  Types.DECIMAL, // aka DECIMAL
  Types.TINY, // aka TINYINT
  Types.SHORT, // aka SMALLINT
  Types.LONG, // aka INT
  Types.FLOAT,
  Types.DOUBLE,
  Types.INT24, // aka MEDIUMINT
  Types.LONGLONG, // aka BIGINT
  Types.NEWDECIMAL, // aka DECIMAL
]);

const DATETIME_TYPES: ReadonlySet<number> = new Set([
  Types.DATETIME,
  Types.DATETIME2, // aka DATETIME with fractional seconds
  Types.TIMESTAMP,
  Types.TIMESTAMP2, // aka TIMESTAMP with fractional seconds
  Types.NEWDATE,
]);

/**
 * Whether a text is worth handing to the JSON editor.
 *
 * The same heuristic as the read-only view (`cellValueToText`): JSON stored in
 * a text column is common, the column type never says so, and a bare scalar
 * gains nothing from a structured editor.
 */
export function looksLikeJson(text: string): boolean {
  const trimmed = text.trim();

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return false;
  }

  try {
    JSON.parse(trimmed);

    return true;
  } catch {
    return false;
  }
}

/**
 * Pick the editor for a cell.
 *
 * The type of the field decides whenever it can: those are the constants the
 * driver ships, and reading them keeps this in step with `Cell.tsx` instead of
 * duplicating a list of type names by hand.
 *
 * `ENUM` and `SET` are the exception, and the protocol is why: it reports such
 * a column as a plain string — the distinction lives in a field flag the driver
 * does not surface — so only INFORMATION_SCHEMA can tell, and it is where the
 * accepted values come from anyway.
 *
 * `text` is the fallback, and a fine one: everything MySQL accepts can be
 * written as a text literal, so an unknown type degrades to a textarea rather
 * than to no editor at all.
 */
export function resolveEditorKind(
  column: ColumnDetail,
  fieldType: number | undefined,
  text: string
): EditorKind {
  const dataType = readDataType(column.DataType);

  if (dataType === DataType.Enum) {
    return EditorKind.Enum;
  }

  if (dataType === DataType.Set) {
    return EditorKind.Set;
  }

  if (fieldType !== undefined) {
    if (fieldType === Types.DATE) {
      return EditorKind.Date;
    }

    if (DATETIME_TYPES.has(fieldType)) {
      return EditorKind.DateTime;
    }

    if (NUMERIC_TYPES.has(fieldType)) {
      return EditorKind.Number;
    }

    if (fieldType === Types.JSON) {
      return EditorKind.Json;
    }
  }

  return looksLikeJson(text) ? EditorKind.Json : EditorKind.Text;
}
