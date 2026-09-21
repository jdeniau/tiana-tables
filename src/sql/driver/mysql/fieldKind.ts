import { Types } from 'mysql';
import { FieldKind } from '../../resultField';

/**
 * MySQL 9's vector type, which `Types` does not name — mysql2 does, as 242.
 *
 * Unmeasured: no MySQL 9 to hand. MariaDB's own `VECTOR` is announced as
 * `VAR_STRING` and answered as bytes, which the value decides on rather than
 * the kind.
 */
const VECTOR = 242;

/**
 * What the app makes of every type MySQL announces a column with.
 *
 * Read from `Types` rather than written as numbers, and held to mysql2's own
 * list by `fieldKind.test.ts`: a type missing from the table would read as
 * `Unknown` in silence.
 */
const KIND_BY_TYPE: Readonly<Record<number, FieldKind>> = {
  [Types.DECIMAL]: FieldKind.Number,
  [Types.TINY]: FieldKind.Number,
  [Types.SHORT]: FieldKind.Number,
  [Types.LONG]: FieldKind.Number,
  [Types.FLOAT]: FieldKind.Number,
  [Types.DOUBLE]: FieldKind.Number,
  [Types.LONGLONG]: FieldKind.Number,
  [Types.INT24]: FieldKind.Number,
  [Types.NEWDECIMAL]: FieldKind.Number,
  // answered as a number, 1901 to 2155
  [Types.YEAR]: FieldKind.Number,

  [Types.TIMESTAMP]: FieldKind.DateTime,
  [Types.DATETIME]: FieldKind.DateTime,
  [Types.NEWDATE]: FieldKind.DateTime,
  [Types.DATE]: FieldKind.Date,
  // answered as `HH:MM:SS`, never as a Date: a duration has no day to sit on
  [Types.TIME]: FieldKind.Time,

  [Types.VARCHAR]: FieldKind.String,
  // `VARBINARY` shares it with `VARCHAR`, and answers bytes
  [Types.VAR_STRING]: FieldKind.String,
  // `CHAR`, and `BINARY` with it
  [Types.STRING]: FieldKind.String,

  // a closed set of labels, which the grid colours like text
  [Types.ENUM]: FieldKind.Text,
  [Types.SET]: FieldKind.Text,
  // one type for `TEXT` and `BLOB` both: only the value says which
  [Types.TINY_BLOB]: FieldKind.Text,
  [Types.MEDIUM_BLOB]: FieldKind.Text,
  [Types.LONG_BLOB]: FieldKind.Text,
  [Types.BLOB]: FieldKind.Text,

  // MySQL only: MariaDB aliases `JSON` to `LONGTEXT` and announces a blob
  [Types.JSON]: FieldKind.Json,

  [Types.BIT]: FieldKind.Binary,

  // answered as a plain object, which no kind of ours describes
  [Types.GEOMETRY]: FieldKind.Unknown,
  // only a prepared statement's parameter carries it, never a result column
  [Types.NULL]: FieldKind.Unknown,
  [VECTOR]: FieldKind.Unknown,
};

/** The kind of a column, `Unknown` for a type the table does not cover. */
export function toFieldKind(type: number | undefined): FieldKind {
  if (type === undefined) {
    return FieldKind.Unknown;
  }

  return KIND_BY_TYPE[type] ?? FieldKind.Unknown;
}

export const testables = {
  KIND_BY_TYPE,
};
