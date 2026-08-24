import { DataType, readDataType } from './dataType';
import type { ColumnDetail } from './types';

/** Why a cell cannot be written. Doubles as the ICU selector of its message. */
export enum NotEditableReason {
  /** no row in INFORMATION_SCHEMA: a computed column of a raw query, a view… */
  UnknownColumn = 'unknownColumn',
  /** raw bytes, which a text editor would corrupt rather than edit */
  Binary = 'binary',
  /** computed by the server, which refuses to be told what it holds */
  Generated = 'generated',
  /** nothing identifies the row, so no UPDATE can target it */
  NoPrimaryKey = 'noPrimaryKey',
}

export type CellEditability =
  | { editable: true }
  | { editable: false; reason: NotEditableReason };

const EDITABLE: CellEditability = { editable: true };

/**
 * Types whose values are bytes rather than text. `blob` and `text` share a
 * single wire type in the protocol, so the grid cannot tell them apart — only
 * `DATA_TYPE` can, which is why editability is decided from the schema and not
 * from the type of the field.
 */
const BINARY_DATA_TYPES: ReadonlySet<string> = new Set([
  DataType.Binary,
  DataType.VarBinary,
  DataType.TinyBlob,
  DataType.Blob,
  DataType.MediumBlob,
  DataType.LongBlob,
  DataType.Bit,
  DataType.Geometry,
]);

/** `Extra` reads `VIRTUAL GENERATED` or `STORED GENERATED` on such a column. */
export function isGenerated(column: ColumnDetail): boolean {
  return /GENERATED/i.test(column.Extra ?? '');
}

export function isNullable(column: ColumnDetail): boolean {
  return column.IsNullable?.toUpperCase() === 'YES';
}

export function isJsonColumn(column: ColumnDetail): boolean {
  return readDataType(column.DataType) === DataType.Json;
}

export function getCellEditability(
  column: ColumnDetail | undefined,
  hasPrimaryKey: boolean
): CellEditability {
  if (!hasPrimaryKey) {
    return { editable: false, reason: NotEditableReason.NoPrimaryKey };
  }

  if (!column) {
    return { editable: false, reason: NotEditableReason.UnknownColumn };
  }

  if (isGenerated(column)) {
    return { editable: false, reason: NotEditableReason.Generated };
  }

  if (BINARY_DATA_TYPES.has(readDataType(column.DataType))) {
    return { editable: false, reason: NotEditableReason.Binary };
  }

  return EDITABLE;
}

/**
 * The values an `ENUM` or a `SET` accepts, read off its declaration —
 * `enum('draft','sent')` — since INFORMATION_SCHEMA exposes them nowhere else.
 *
 * Parsed rather than split on commas: a value may hold a comma, and MySQL
 * writes a quote inside a value as `''` (or, depending on the server, `\'`).
 * Anything that is not such a declaration yields an empty list, which callers
 * read as "not a closed set of values".
 */
export function parseEnumValues(columnType: string): Array<string> {
  // matching the `COLUMN_TYPE` declaration, not a `DATA_TYPE` value: this is a
  // grammar, so it stays a literal pattern
  const declaration = /^(?:enum|set)\s*\((.*)\)$/is.exec(columnType.trim());

  if (!declaration) {
    return [];
  }

  const body = declaration[1];
  const values: Array<string> = [];
  let current = '';
  let inValue = false;

  for (let index = 0; index < body.length; index++) {
    const char = body[index];

    if (!inValue) {
      // between two values: only the opening quote matters
      inValue = char === "'";
      continue;
    }

    if (char === '\\' && index + 1 < body.length) {
      current += body[index + 1];
      index++;
      continue;
    }

    if (char === "'") {
      if (body[index + 1] === "'") {
        current += "'";
        index++;
        continue;
      }

      values.push(current);
      current = '';
      inValue = false;
      continue;
    }

    current += char;
  }

  return values;
}
