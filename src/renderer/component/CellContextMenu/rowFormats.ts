import type { Dialect } from '../../../sql/dialect/types';
import { FieldKind } from '../../../sql/resultField';
import { formatDate, formatDateTime } from '../../utils/dateFormatter';
import type { ColumnMeta } from '../TableGrid';
import toHexLiteral from '../hexLiteral';
import { cellValueToSqlLiteral } from './cellValueToSqlLiteral';

/** One value of the row the menu was opened on, with the column it sits in. */
export interface RowCell {
  column: ColumnMeta;
  value: unknown;
}

/** What "Copy row as" writes. Doubles as the key of its menu entry. */
export enum RowFormat {
  Json = 'json',
  Csv = 'csv',
  SqlInsert = 'sqlInsert',
}

function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/** A date as the wall clock the grid displays, not the UTC instant `toJSON` writes. */
function dateText(value: Date, kind: FieldKind): string {
  return kind === FieldKind.Date ? formatDate(value) : formatDateTime(value);
}

/** Bytes as a hexadecimal literal, every one of them: a copy is never cut short. */
function bytesText(bytes: Uint8Array): string {
  return toHexLiteral(bytes, bytes.length);
}

/**
 * The row as one JSON object, keyed by column name.
 *
 * Values keep their JSON type — a number stays a number, a JSON column stays
 * nested — except what JSON has no type for: a date is written as the grid
 * shows it, bytes as their hexadecimal literal. Two columns of a raw query may
 * share a name; the last one wins, as it does in the rows the driver hands
 * over as objects.
 */
export function rowToJson(cells: ReadonlyArray<RowCell>): string {
  const row: Record<string, unknown> = {};

  for (const { column, value } of cells) {
    row[column.name] = toJsonValue(value, column.kind);
  }

  return JSON.stringify(row, null, 2);
}

function toJsonValue(value: unknown, kind: FieldKind): unknown {
  if (isNullish(value)) {
    return null;
  }

  if (value instanceof Date) {
    return dateText(value, kind);
  }

  if (value instanceof Uint8Array) {
    return bytesText(value);
  }

  // `JSON.stringify` throws on a bigint
  if (typeof value === 'bigint') {
    return String(value);
  }

  return value;
}

/**
 * The row as delimited text (RFC 4180): the column names, then the values.
 *
 * A field is quoted only when it has to be — it holds the delimiter, a quote or
 * a line break —, which also keeps a quoted empty string apart from NULL, left
 * as an empty field.
 */
export function rowToCsv(cells: ReadonlyArray<RowCell>): string {
  const header = cells.map(({ column }) => csvField(column.name));
  const values = cells.map(({ column, value }) =>
    isNullish(value) ? '' : csvField(toFlatText(value, column.kind))
  );

  return `${header.join(',')}\n${values.join(',')}`;
}

/** A value on one line: a JSON column compact, not indented as in the modal. */
function toFlatText(value: unknown, kind: FieldKind): string {
  if (value instanceof Date) {
    return dateText(value, kind);
  }

  if (value instanceof Uint8Array) {
    return bytesText(value);
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }

  return String(value);
}

function csvField(text: string): string {
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * The row as the `INSERT` that would write it again, into the table it was
 * read from, or `undefined` when there is no such table to name.
 *
 * That takes every column to be one the schema knows, of one and the same
 * table: a computed column of a raw query, or a join, has nowhere to go. A
 * column the server computes is left out, since it refuses to be given a value.
 */
export function rowToInsert(
  dialect: Dialect,
  databaseName: string | null,
  cells: ReadonlyArray<RowCell>
): string | undefined {
  const tableName = cells[0]?.column.tableName;

  if (
    !databaseName ||
    !tableName ||
    cells.some(({ column }) => !column.detail || column.tableName !== tableName)
  ) {
    return undefined;
  }

  const written = cells.filter(({ column }) => !column.detail?.generated);
  const names = written.map(({ column }) => column.name);

  // `SELECT *, id` names a column twice, which no INSERT accepts
  if (written.length === 0 || new Set(names).size !== names.length) {
    return undefined;
  }

  const columns = names.map((name) => dialect.escapeIdentifier(name));
  const values = written.map(({ column, value }) =>
    toSqlLiteral(dialect, value, column.kind)
  );

  return `INSERT INTO ${dialect.qualify(databaseName, tableName)} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
}

function toSqlLiteral(
  dialect: Dialect,
  value: unknown,
  kind: FieldKind
): string {
  if (isNullish(value)) {
    return 'NULL';
  }

  if (value instanceof Uint8Array) {
    return dialect.bytesLiteral(value);
  }

  // every other value has a literal: only NULL and bytes come back undefined
  return cellValueToSqlLiteral(dialect, value, kind) ?? 'NULL';
}
