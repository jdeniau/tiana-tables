import type { SqlBoundValue } from '../../../sql/types';
import cellValueToText from '../cellValueToText';
import { looksLikeJson } from './editorKind';

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
 * value opens indented, which is what makes it editable at all. The
 * consequence is deliberate — saving an edited JSON value stores it indented,
 * even in a text column, since only a value the user actually changed is ever
 * written.
 */
export function toEditableValue(
  value: unknown,
  fieldType: number | undefined
): EditableValue {
  return {
    isNull: value === null || value === undefined,
    text: cellValueToText(value, fieldType),
  };
}

/** The value handed to the UPDATE: a string, or `NULL`. */
export function toSqlValue({ isNull, text }: EditableValue): string | null {
  return isNull ? null : text;
}

/**
 * A loaded value, turned into something the write can be guarded on.
 *
 * The driver hands rows over already typed — a `Date` for a `DATETIME`, an
 * object for a `JSON` column — and those types are what must go back for the
 * comparison to mean the same thing. A `Date` travels as is (structured clone
 * carries it, mysql2 formats it), an object goes back as the JSON text the
 * server parses again.
 */
export function toBoundValue(value: unknown): SqlBoundValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  // all that is left is a JSON column, which mysql2 hands over already parsed —
  // the only editable kind the driver does not answer with a scalar
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
 *
 * A text column that merely *holds* JSON is not checked, even though it gets
 * the JSON editor: turning its content into something else is a legitimate
 * edit, and Monaco already underlines what is no longer valid JSON.
 */
export function findValidationError(
  value: EditableValue,
  isJsonColumn: boolean
): ValidationError | null {
  if (value.isNull || !isJsonColumn) {
    return null;
  }

  const trimmed = value.text.trim();

  // a JSON column also accepts a bare scalar, which `looksLikeJson` skips
  if (looksLikeJson(trimmed)) {
    return null;
  }

  try {
    JSON.parse(trimmed);

    return null;
  } catch {
    return ValidationError.InvalidJson;
  }
}
