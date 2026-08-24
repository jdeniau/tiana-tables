import { Types } from 'mysql'; // importing from mysql2 will import the commonjs package and will fail
import { formatDate, formatDateTime } from '../utils/dateFormatter';

/**
 * Turn a cell value into the text shown in the detail modal.
 *
 * This is the full value, not the truncated one-liner of the grid: JSON gets
 * indented, dates keep the formatting of the grid, and NULL becomes an empty
 * text (the modal says so with a placeholder).
 */
export default function cellValueToText(
  value: unknown,
  type: number | undefined
): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return type === Types.DATE ? formatDate(value) : formatDateTime(value);
  }

  if (typeof value === 'string') {
    return indentJsonIfAny(value);
  }

  // mysql2 hands JSON columns over as already parsed objects
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

/**
 * Indent a value that happens to hold JSON, whatever the type of its column:
 * JSON stored in a text column is common enough (and the column type never
 * says so) that testing the value is more useful than trusting the type.
 *
 * Only objects and arrays are reformatted. A bare JSON scalar is left alone:
 * `JSON.parse` would round-trip a long number through a float and lose digits,
 * and reformatting `42` or `"foo"` gains nothing anyway.
 */
function indentJsonIfAny(value: string): string {
  const trimmed = value.trim();

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return value;
  }

  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return value;
  }
}
