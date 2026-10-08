import { FieldKind } from '../../sql/resultField';
import { isNullish } from '../utils/isNullish';
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
 * This is the full value, not the truncated one-liner of the grid: a JSON
 * column's text gets indented, a date is the server's text, fraction and offset
 * included, and NULL becomes an empty text (the modal says so with a placeholder).
 */
export default function cellValueToText(
  value: unknown,
  kind: FieldKind
): string {
  if (isNullish(value)) {
    return '';
  }

  if (typeof value === 'string') {
    return kind === FieldKind.Json ? indentJson(value) : value;
  }

  // before the object branch: a `Buffer` crosses the bridge as a `Uint8Array`,
  // which `JSON.stringify` writes out as a map of indexes to bytes
  if (value instanceof Uint8Array) {
    return toHexLiteral(value, MAX_BINARY_BYTES);
  }

  // a spatial value mysql2 answers as `{ x, y }`: JSON comes as text, indented above
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

/**
 * Indent the text of a JSON column; JSON stored in a column of another type
 * stays as it is written.
 *
 * Only objects and arrays are reformatted. A bare JSON scalar is left alone:
 * `JSON.parse` would round-trip a long number through a float and lose digits,
 * and reformatting `42` or `"foo"` gains nothing anyway.
 */
function indentJson(value: string): string {
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
