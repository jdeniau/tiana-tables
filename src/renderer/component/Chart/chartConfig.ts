import { Types } from 'mysql'; // importing from mysql2 will import the commonjs package and will fail
import type { FieldPacket } from 'mysql2/promise';

export type ChartKind = 'line' | 'bar';

export interface ChartConfig {
  kind: ChartKind;
  /** index of the column carrying the X axis, in `fields` order */
  x: number;
  /** indexes of the columns plotted as series, in `fields` order */
  y: number[];
}

/**
 * Why the chart tab is not usable on this result.
 *
 * The tab is never hidden — an absent tab is a mystery, a greyed one that says
 * why is not. The values are the branches of the `chart.unavailable` ICU
 * select, the same shape as `NotEditableReason` and `cell.detail.readOnly`.
 */
export enum ChartUnavailableReason {
  NotTabular = 'notTabular',
  HasLimit = 'hasLimit',
  NoRow = 'noRow',
  NoNumericColumn = 'noNumericColumn',
}

/**
 * The protocol types that hold a number.
 *
 * Same grouping as the `NumberCell` branch of `Cell.tsx`. The types that file
 * throws on — TIME, YEAR, BIT, GEOMETRY — are simply absent here: an unplottable
 * column is one we do not offer, never one we raise on.
 */
const NUMERIC_TYPES: ReadonlySet<number> = new Set([
  Types.TINY, // TINYINT
  Types.SHORT, // SMALLINT
  Types.LONG, // INT
  Types.INT24, // MEDIUMINT
  Types.FLOAT,
  Types.DOUBLE,
  Types.DECIMAL,
  Types.NEWDECIMAL,
  Types.LONGLONG, // BIGINT
]);

export function isNumericField(field: FieldPacket): boolean {
  return field.type !== undefined && NUMERIC_TYPES.has(field.type);
}

export function numericFieldIndexes(
  fields: readonly FieldPacket[]
): Array<number> {
  return fields.reduce<Array<number>>(
    (indexes, field, index) =>
      isNumericField(field) ? [...indexes, index] : indexes,
    []
  );
}

/**
 * The chart this result opens on.
 *
 * The X axis is the first column we are not going to plot, which lands on the
 * shape this feature exists for: `SELECT day, COUNT(*) … GROUP BY day`. Returns
 * `null` when nothing is left to plot once the X axis is taken — a single
 * numeric column charts against nothing.
 */
export function defaultChartConfig(
  fields: readonly FieldPacket[]
): ChartConfig | null {
  const numeric = numericFieldIndexes(fields);

  if (numeric.length === 0) {
    return null;
  }

  const firstNonNumeric = fields.findIndex((field) => !isNumericField(field));
  const x = firstNonNumeric === -1 ? numeric[0] : firstNonNumeric;
  const y = numeric.filter((index) => index !== x);

  return y.length === 0 ? null : { kind: 'line', x, y };
}

export function chartUnavailableReason({
  isTabular,
  hasLimit,
  rowCount,
  fields,
}: {
  isTabular: boolean;
  hasLimit: boolean;
  rowCount: number;
  fields: readonly FieldPacket[];
}): ChartUnavailableReason | null {
  if (!isTabular) {
    return ChartUnavailableReason.NotTabular;
  }

  // A partial result set would draw a chart that looks right and is not, which
  // is the one outcome worth refusing outright.
  if (hasLimit) {
    return ChartUnavailableReason.HasLimit;
  }

  if (rowCount === 0) {
    return ChartUnavailableReason.NoRow;
  }

  if (defaultChartConfig(fields) === null) {
    return ChartUnavailableReason.NoNumericColumn;
  }

  return null;
}
