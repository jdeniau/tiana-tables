import { Types } from 'mysql';
import { Types as RuntimeTypes } from 'mysql2';
import { describe, expect, test } from 'vitest';
import { FieldKind } from '../../resultField';
import { testables, toFieldKind } from './fieldKind';

/**
 * Every type mysql2 can announce, as `[name, wire number]`.
 *
 * Its `Types` maps both ways at runtime, and only this direction is complete:
 * the reverse one is missing `VECTOR`, so enumerating the numeric keys would
 * let a type through. The named constants below come from `mysql` instead,
 * whose `Types` is a `const enum` — inlined, so it cannot be enumerated at all.
 */
const { KIND_BY_TYPE } = testables;

const WIRE_TYPES: Array<[string, number]> = Object.entries(RuntimeTypes)
  .filter(([key]) => !Number.isInteger(Number(key)))
  .map(([name, type]) => [name, Number(type)]);

describe('KIND_BY_TYPE', () => {
  test('covers every type mysql2 can announce', () => {
    const missing = WIRE_TYPES.filter(
      ([, type]) => !(type in KIND_BY_TYPE)
    ).map(([name]) => name);

    expect(missing).toEqual([]);
  });

  test('names no type mysql2 does not announce', () => {
    const announced = WIRE_TYPES.map(([, type]) => type);
    const unknown = Object.keys(KIND_BY_TYPE)
      .map(Number)
      .filter((type) => !announced.includes(type));

    expect(unknown).toEqual([]);
  });
});

/** the collation of a text column, against 63 for one holding bytes */
const UTF8 = 224;

describe('toFieldKind', () => {
  test.each([
    // measured against MariaDB 11.8: a YEAR column is answered as a number
    ['YEAR', Types.YEAR, UTF8, FieldKind.Number],
    // and a TIME column as `HH:MM:SS`, never as a Date
    ['TIME', Types.TIME, 63, FieldKind.Time],
    ['DATE', Types.DATE, 63, FieldKind.Date],
    ['DATETIME', Types.DATETIME, 63, FieldKind.DateTime],
    ['VARCHAR', Types.VAR_STRING, UTF8, FieldKind.String],
    ['TEXT', Types.BLOB, UTF8, FieldKind.Text],
    ['ENUM', Types.ENUM, UTF8, FieldKind.Text],
    ['BIT', Types.BIT, 63, FieldKind.Binary],
    // answered as a plain object, which no kind of ours describes
    ['GEOMETRY', Types.GEOMETRY, 63, FieldKind.Unknown],
  ])('reads %s as its kind', (_name, type, characterSet, expected) => {
    expect(toFieldKind(type, characterSet)).toBe(expected);
  });

  /**
   * The whole reason the collation is read: each of these three types is
   * announced for a text column and for a byte one alike, and 63 is the only
   * thing in the packet that separates them. All measured on `tiana-dev-mysql`,
   * where the binary half of each pair is handed over as a `Buffer` and the
   * other as a string.
   */
  test.each([
    ['BLOB', 'TEXT', Types.BLOB],
    ['VARBINARY', 'VARCHAR', Types.VAR_STRING],
    ['BINARY', 'CHAR', Types.STRING],
  ])('tells a %s from a %s by its collation', (_binary, _text, type) => {
    expect(toFieldKind(type, 63)).toBe(FieldKind.Binary);
    expect(toFieldKind(type, UTF8)).not.toBe(FieldKind.Binary);
  });

  /**
   * 63 on its own says nothing: `TIME` answers a string under it, `BIT` bytes
   * a kind of its own, and `GEOMETRY` an object. Only a kind that would
   * otherwise have claimed to hold characters is reconsidered.
   */
  test('leaves a type that never held characters alone', () => {
    expect(toFieldKind(Types.TIME, 63)).toBe(FieldKind.Time);
    expect(toFieldKind(Types.BIT, 63)).toBe(FieldKind.Binary);
    expect(toFieldKind(Types.GEOMETRY, 63)).toBe(FieldKind.Unknown);
    expect(toFieldKind(Types.LONG, 63)).toBe(FieldKind.Number);
  });

  // MariaDB aliases `JSON` to `LONGTEXT`, and the alias carries `BINARY_FLAG`
  // while answering a string — which is why the flags are not what is read
  test('reads a MariaDB JSON column, a LONGTEXT, as text', () => {
    expect(toFieldKind(Types.BLOB, UTF8)).toBe(FieldKind.Text);
  });

  test('reads a type it does not know as Unknown', () => {
    expect(toFieldKind(9999, UTF8)).toBe(FieldKind.Unknown);
  });

  test('reads a column with no type at all as Unknown', () => {
    expect(toFieldKind(undefined, UTF8)).toBe(FieldKind.Unknown);
  });

  // mysql2 types it as optional, and a driver of ours must not guess binary
  test('reads a column with no collation by its type alone', () => {
    expect(toFieldKind(Types.BLOB, undefined)).toBe(FieldKind.Text);
  });
});
