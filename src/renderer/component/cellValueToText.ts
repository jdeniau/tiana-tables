import { FieldKind } from '../../sql/resultField';
import { formatDate, formatDateTime } from '../utils/dateFormatter';
import toHexLiteral from './hexLiteral';

/**
 * How many bytes of a byte column the modal writes out. It shows the whole of
 * everything else, but a `LONGBLOB` holds up to 4 GB and two characters a byte
 * would be the end of the window.
 */
const MAX_BINARY_BYTES = 4096;

/**
 * Turn a cell value into the text shown in the detail modal.
 *
 * This is the full value, not the truncated one-liner of the grid: JSON gets
 * indented, dates keep the formatting of the grid, and NULL becomes an empty
 * text (the modal says so with a placeholder).
 */
export default function cellValueToText(
  value: unknown,
  kind: FieldKind
): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return kind === FieldKind.Date ? formatDate(value) : formatDateTime(value);
  }

  if (typeof value === 'string') {
    return indentJsonIfAny(value);
  }

  // before the object branch: a `Buffer` crosses the bridge as a `Uint8Array`,
  // which `JSON.stringify` writes out as a map of indexes to bytes
  if (value instanceof Uint8Array) {
    return toHexLiteral(value, MAX_BINARY_BYTES);
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
