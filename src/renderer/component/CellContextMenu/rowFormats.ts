import type { Dialect } from '../../../sql/dialect/types';
import type { FieldKind } from '../../../sql/resultField';
import {
  type ZoneShift,
  dateTextToIso,
  dateTextToShownIso,
  isDateKind,
} from '../../utils/dateFormatter';
import { isNullish } from '../../utils/isNullish';
import type { ColumnMeta } from '../TableGrid';
import toHexLiteral from '../hexLiteral';
import { cellValueToSqlLiteral } from './cellValueToSqlLiteral';

/** One value of the row the menu was opened on, with the column it sits in. */
export interface RowCell {
  column: ColumnMeta;
  value: unknown;
}

/** What a copy writes. Doubles as the key of its menu entry. */
export enum RowFormat {
  Tsv = 'tsv',
  Csv = 'csv',
  Markdown = 'markdown',
  Json = 'json',
  SqlInsert = 'sqlInsert',
}

/** How the grid shows a date, which the formats read by people copy as it reads. */
export interface DateShown {
  shift: ZoneShift | null;
  serverZone: string | null;
}

/**
 * The rows as JSON objects keyed by column name: an array of them, or the object alone for a single row.
 *
 * Values keep their JSON type — a number stays a number, a JSON column stays
 * nested — except what JSON has no type for: a date is written in ISO 8601, a
 * wall clock taken in `serverZone`, bytes as their hexadecimal literal. Two columns of a raw query may
 * share a name; the last one wins, as it does in the rows the driver hands
 * over as objects.
 */
export function rowsToJson(
  rows: ReadonlyArray<ReadonlyArray<RowCell>>,
  serverZone: string | null
): string {
  const objects = rows.map((cells) => toJsonObject(cells, serverZone));

  return JSON.stringify(objects.length === 1 ? objects[0] : objects, null, 2);
}

function toJsonObject(
  cells: ReadonlyArray<RowCell>,
  serverZone: string | null
): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  for (const { column, value } of cells) {
    row[column.name] = toJsonValue(value, column.kind, serverZone);
  }

  return row;
}

function toJsonValue(
  value: unknown,
  kind: FieldKind,
  serverZone: string | null
): unknown {
  if (isNullish(value)) {
    return null;
  }

  // a point in time reads as the same instant anywhere
  if (typeof value === 'string' && isDateKind(kind)) {
    return dateTextToIso(value, kind, serverZone);
  }

  if (value instanceof Uint8Array) {
    return toHexLiteral(value);
  }

  // `JSON.stringify` throws on a bigint
  if (typeof value === 'bigint') {
    return String(value);
  }

  return value;
}

/**
 * The rows as delimited text (RFC 4180): the column names when asked, then a line per row.
 *
 * A field is quoted only when it has to be — it holds the delimiter, a quote or
 * a line break —, which also keeps a quoted empty string apart from NULL, left
 * as an empty field.
 */
export function rowsToCsv(
  rows: ReadonlyArray<ReadonlyArray<RowCell>>,
  serverZone: string | null,
  withColumnNames: boolean
): string {
  const lines = rows.map((cells) =>
    cells
      .map(({ column, value }) =>
        isNullish(value)
          ? ''
          : csvField(
              toFlatText(value, column.kind, (date) =>
                dateTextToIso(date, column.kind, serverZone)
              )
            )
      )
      .join(',')
  );

  return [
    ...(withColumnNames ? [columnNames(rows).map(csvField).join(',')] : []),
    ...lines,
  ].join('\n');
}

/**
 * The rows as tab-separated text, which a spreadsheet pastes into cells: the column names when asked, then a line per row.
 * NULL is an empty field, and a tab or a line break inside a value becomes a space.
 */
export function rowsToTsv(
  rows: ReadonlyArray<ReadonlyArray<RowCell>>,
  shown: DateShown,
  withColumnNames: boolean
): string {
  const lines = rows.map((cells) =>
    cells
      .map((cell) => shownText(cell, shown).replace(/[\t\r\n]/g, ' '))
      .join('\t')
  );

  return [
    ...(withColumnNames ? [columnNames(rows).join('\t')] : []),
    ...lines,
  ].join('\n');
}

/** The rows as the HTML table pasted beside the TSV, which a document or a mail keeps as a table. */
export function rowsToHtmlTable(
  rows: ReadonlyArray<ReadonlyArray<RowCell>>,
  shown: DateShown,
  withColumnNames: boolean
): string {
  const head = withColumnNames
    ? `<thead><tr>${columnNames(rows)
        .map((name) => `<th>${escapeHtml(name)}</th>`)
        .join('')}</tr></thead>`
    : '';
  const body = rows
    .map(
      (cells) =>
        `<tr>${cells.map((cell) => `<td>${escapeHtml(shownText(cell, shown))}</td>`).join('')}</tr>`
    )
    .join('');

  return `<table>${head}<tbody>${body}</tbody></table>`;
}

/**
 * The rows as a Markdown table, always headed by the column names, numbers set flush right.
 * NULL is written out, a `|` is escaped and a line break becomes a space.
 */
export function rowsToMarkdown(
  rows: ReadonlyArray<ReadonlyArray<RowCell>>,
  shown: DateShown
): string {
  const line = (fields: ReadonlyArray<string>): string =>
    `| ${fields.map((field) => field.replaceAll('|', '\\|').replace(/[\r\n]/g, ' ')).join(' | ')} |`;
  const alignments = (rows[0] ?? []).map(({ column }) =>
    column.numeric ? '---:' : '---'
  );

  return [
    line(columnNames(rows)),
    `| ${alignments.join(' | ')} |`,
    ...rows.map((cells) =>
      line(
        cells.map((cell) =>
          isNullish(cell.value) ? 'NULL' : shownText(cell, shown)
        )
      )
    ),
  ].join('\n');
}

function columnNames(rows: ReadonlyArray<ReadonlyArray<RowCell>>): string[] {
  return (rows[0] ?? []).map(({ column }) => column.name);
}

/** A value as the grid shows it, on one line, NULL left empty. */
function shownText({ column, value }: RowCell, shown: DateShown): string {
  return isNullish(value)
    ? ''
    : toFlatText(value, column.kind, (date) =>
        dateTextToShownIso(date, column.kind, shown.shift, shown.serverZone)
      );
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/** A value on one line: a JSON column compact, not indented as in the modal, a date as `formatDate` writes it. */
function toFlatText(
  value: unknown,
  kind: FieldKind,
  formatDate: (text: string) => string
): string {
  if (typeof value === 'string' && isDateKind(kind)) {
    return formatDate(value);
  }

  if (value instanceof Uint8Array) {
    return toHexLiteral(value);
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
 * The rows as the one `INSERT` that would write them again, into the table
 * they were read from, or `undefined` when there is no such table to name.
 *
 * That takes every column to be one the schema knows, of one and the same
 * table: a computed column of a raw query, or a join, has nowhere to go. A
 * column the server computes is left out, since it refuses to be given a value.
 */
export function rowsToInsert(
  dialect: Dialect,
  databaseName: string | null,
  rows: ReadonlyArray<ReadonlyArray<RowCell>>
): string | undefined {
  const cells = rows[0] ?? [];
  const tableName = cells[0]?.column.tableName;

  if (
    !databaseName ||
    !tableName ||
    cells.some(({ column }) => !column.detail || column.tableName !== tableName)
  ) {
    return undefined;
  }

  const written = cells.flatMap(({ column }, index) =>
    column.detail?.generated ? [] : [index]
  );
  const names = written.map((index) => cells[index].column.name);

  // `SELECT *, id` names a column twice, which no INSERT accepts
  if (written.length === 0 || new Set(names).size !== names.length) {
    return undefined;
  }

  const columns = names.map((name) => dialect.escapeIdentifier(name));
  const values = rows.map(
    (row) =>
      `(${written.map((index) => toSqlLiteral(dialect, row[index].value)).join(', ')})`
  );
  const into = `INSERT INTO ${dialect.qualify(databaseName, tableName)} (${columns.join(', ')}) VALUES`;

  // a single row stays on the line it always had
  return values.length === 1
    ? `${into} ${values[0]};`
    : `${into}\n  ${values.join(',\n  ')};`;
}

function toSqlLiteral(dialect: Dialect, value: unknown): string {
  if (isNullish(value)) {
    return 'NULL';
  }

  if (value instanceof Uint8Array) {
    return dialect.bytesLiteral(value);
  }

  // every other value has a literal: only NULL and bytes come back undefined
  return cellValueToSqlLiteral(dialect, value) ?? 'NULL';
}
