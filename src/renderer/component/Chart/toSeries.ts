import { Types } from 'mysql'; // importing from mysql2 will import the commonjs package and will fail
import type { FieldPacket, RowDataPacket } from 'mysql2/promise';
import { formatDate, formatDateTime } from '../../utils/dateFormatter';
import type { ChartConfig } from './chartConfig';

/**
 * How many points a chart draws at most.
 *
 * The raw SQL page has no LIMIT by construction here, so a result can be
 * arbitrarily long. Past a few thousand points an SVG chart is both slow and
 * unreadable. Truncation is never silent: `isTruncated` is what the panel warns
 * on — a chart that quietly drops the tail of the data is the very failure this
 * feature guards against elsewhere.
 */
export const MAX_POINTS = 1000;

export interface LineSeries {
  id: string;
  data: Array<{ x: string; y: number }>;
}

export type BarDatum = Record<string, string | number>;

export interface BarData {
  data: Array<BarDatum>;
  keys: Array<string>;
  indexBy: string;
}

/**
 * Read a cell, whichever shape the rows have.
 *
 * The raw SQL page queries with `rowsAsArray`, so rows are arrays indexed by
 * column position; everywhere else they are objects keyed by column name.
 * `TableGrid` makes the same distinction.
 */
function readCell(
  row: RowDataPacket,
  index: number,
  field: FieldPacket,
  rowsAsArray: boolean
): unknown {
  return rowsAsArray ? row[index] : row[field.name];
}

/**
 * Coerce a value from a numeric column into a number.
 *
 * mysql2 runs with its default options (see `src/sql/index.ts`), and those hand
 * DECIMAL and NEWDECIMAL over as **strings** to keep their precision. So a
 * perfectly ordinary `SUM(price)` arrives as `'1234.50'`; handing that to the
 * chart draws nothing at all, without an error. Hence this.
 */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    // `Number('')` is 0, which would turn an empty string into a real point
    return value.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

/**
 * The label a value takes on the X axis.
 *
 * Both scales are categorical (`point` for lines, the index for bars), so every
 * X is a string. DATE and DATETIME columns arrive as `Date` objects with the
 * default mysql2 options, and their ISO form makes a poor axis label.
 */
export function toAxisLabel(value: unknown, isDateOnly: boolean): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return isDateOnly ? formatDate(value) : formatDateTime(value);
  }

  return String(value);
}

interface Input {
  rows: readonly RowDataPacket[];
  fields: readonly FieldPacket[];
  config: ChartConfig;
  rowsAsArray: boolean;
}

function axisLabels({ rows, fields, config, rowsAsArray }: Input): {
  labels: Array<string>;
  isTruncated: boolean;
} {
  const xField = fields[config.x];
  // DATE has no time part to show; every other temporal type does. mysql2 hands
  // both over as `Date`, so the column type is the only thing that tells them
  // apart.
  const isDateOnly = xField?.type === Types.DATE;

  const kept = rows.slice(0, MAX_POINTS);

  return {
    labels: kept.map((row) =>
      toAxisLabel(readCell(row, config.x, xField, rowsAsArray), isDateOnly)
    ),
    isTruncated: rows.length > MAX_POINTS,
  };
}

export function toLineSeries(input: Input): {
  series: Array<LineSeries>;
  isTruncated: boolean;
} {
  const { rows, fields, config, rowsAsArray } = input;
  const { labels, isTruncated } = axisLabels(input);
  const kept = rows.slice(0, MAX_POINTS);

  const series = config.y.map((columnIndex) => {
    const field = fields[columnIndex];

    return {
      id: field?.name ?? String(columnIndex),
      data: kept.flatMap((row, rowIndex) => {
        const y = toNumber(readCell(row, columnIndex, field, rowsAsArray));

        // A NULL is a hole in the series, not a zero
        return y === null ? [] : [{ x: labels[rowIndex], y }];
      }),
    };
  });

  return { series, isTruncated };
}

export function toBarData(input: Input): BarData & { isTruncated: boolean } {
  const { rows, fields, config, rowsAsArray } = input;
  const { labels, isTruncated } = axisLabels(input);
  const kept = rows.slice(0, MAX_POINTS);

  const indexBy = fields[config.x]?.name ?? 'x';
  const keys = config.y.map(
    (columnIndex) => fields[columnIndex]?.name ?? String(columnIndex)
  );

  const data = kept.map((row, rowIndex) => {
    const datum: BarDatum = { [indexBy]: labels[rowIndex] };

    config.y.forEach((columnIndex, keyIndex) => {
      const value = toNumber(
        readCell(row, columnIndex, fields[columnIndex], rowsAsArray)
      );

      if (value !== null) {
        datum[keys[keyIndex]] = value;
      }
    });

    return datum;
  });

  return { data, keys, indexBy, isTruncated };
}
