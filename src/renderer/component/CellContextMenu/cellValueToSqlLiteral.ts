// importing from mysql2 will import the commonjs package and will fail. `escape`
// is the driver's own escaping (it delegates to `sqlstring`, the package mysql2
// escapes with too), and it is only ever called on a string here: its object
// branch calls `Buffer.isBuffer`, which would throw in the renderer, and its
// `Date` branch would shift the value into a time zone it never had.
import { Types, escape } from 'mysql';
import { formatDate, formatDateTime } from '../../utils/dateFormatter';

/**
 * A cell value, turned into the SQL literal that compares to it.
 *
 * The driver hands rows over already typed, and the type is what decides the
 * form of the literal: a number is written bare (quoting it would work, MySQL
 * coerces, but the clause is shown to the user and read by them), a date is
 * written as the wall clock the grid displays, everything else is a quoted
 * string.
 *
 * `undefined` — and not `'NULL'` — for a value that has none: `= NULL` is never
 * true, so a null cell offers no comparison at all. The menu reads the absence
 * of a literal as "this source is unavailable" and disables the entry, leaving
 * `IS NULL` as the way to filter on it.
 */
export function cellValueToSqlLiteral(
  value: unknown,
  fieldType: number | undefined
): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }

  if (value instanceof Date) {
    return escape(
      fieldType === Types.DATE ? formatDate(value) : formatDateTime(value)
    );
  }

  if (typeof value === 'string') {
    return escape(value);
  }

  // raw bytes: `String(bytes)` would compare against a decoding the server
  // never performed, so there is no literal to offer
  if (value instanceof Uint8Array) {
    return undefined;
  }

  // all that is left is a JSON column, which mysql2 hands over already parsed
  return escape(JSON.stringify(value));
}
