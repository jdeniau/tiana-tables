import type { FieldKind } from '../../../sql/resultField';
import type { SqlBoundValue } from '../../../sql/types';
import { isNullish } from '../../utils/isNullish';
import cellValueToText from '../cellValueToText';

/**
 * What every editor works on: the value as text, or the absence of a value.
 *
 * Text, and not a typed value, because text is what MySQL accepts for all of
 * them — and because it is the only form that keeps a `BIGINT` beyond
 * `Number.MAX_SAFE_INTEGER`, or the scale of a `DECIMAL`, intact on the way to
 * the server. Going through a JavaScript number would round both.
 */
export interface EditableValue {
  isNull: boolean;
  text: string;
}

/**
 * The value a cell was loaded with, as the editor opens on it.
 *
 * The text is the one the read-only view shows, indentation included: a JSON
 * column's value opens indented, which is what makes it editable at all. The
 * consequence is deliberate — saving an edited JSON value stores it indented,
 * since only a value the user actually changed is ever written.
 */
export function toEditableValue(
  value: unknown,
  kind: FieldKind
): EditableValue {
  return {
    isNull: isNullish(value),
    text: cellValueToText(value, kind),
  };
}

/** The value handed to the UPDATE: a string, or `NULL`. */
export function toSqlValue({ isNull, text }: EditableValue): string | null {
  return isNull ? null : text;
}

/**
 * A loaded value, turned into something the write can be guarded on.
 *
 * A value goes back as what the server compares the same way: as the driver
 * answered it — a date or a JSON value is the server's own text —, an object
 * as its JSON text.
 */
export function toBoundValue(value: unknown): SqlBoundValue {
  if (isNullish(value)) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  // all that is left is an object, a spatial value mysql2 answers as `{ x, y }`: JSON comes as text
  return JSON.stringify(value);
}

export function isSameValue(
  left: EditableValue,
  right: EditableValue
): boolean {
  return left.isNull === right.isNull && left.text === right.text;
}

/** Why a value cannot be saved. Doubles as the ICU selector of its message. */
export enum ValidationError {
  InvalidJson = 'invalidJson',
}

/**
 * Why a value cannot be saved yet, or `null` when it can.
 *
 * Only a declared JSON column is checked: it is the one kind where a typo
 * produces a value the server rejects outright rather than coerces, and where
 * the editor can say so before a round trip. Everything else is left to MySQL,
 * whose own rules on ranges, character sets and dates are the ones that count.
 */
export function findValidationError(
  value: EditableValue,
  isJsonColumn: boolean
): ValidationError | null {
  if (value.isNull || !isJsonColumn) {
    return null;
  }

  try {
    JSON.parse(value.text.trim());

    return null;
  } catch {
    return ValidationError.InvalidJson;
  }
}
