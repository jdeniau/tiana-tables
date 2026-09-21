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

describe('toFieldKind', () => {
  test.each([
    // measured against MariaDB 11.8: a YEAR column is answered as a number
    ['YEAR', Types.YEAR, FieldKind.Number],
    // and a TIME column as `HH:MM:SS`, never as a Date
    ['TIME', Types.TIME, FieldKind.Time],
    ['DATE', Types.DATE, FieldKind.Date],
    ['DATETIME', Types.DATETIME, FieldKind.DateTime],
    ['VARCHAR', Types.VAR_STRING, FieldKind.String],
    // TEXT and BLOB share this one type, so no kind can separate them
    ['BLOB', Types.BLOB, FieldKind.Text],
    ['ENUM', Types.ENUM, FieldKind.Text],
    ['BIT', Types.BIT, FieldKind.Binary],
    // answered as a plain object, which no kind of ours describes
    ['GEOMETRY', Types.GEOMETRY, FieldKind.Unknown],
  ])('reads %s as its kind', (_name, type, expected) => {
    expect(toFieldKind(type)).toBe(expected);
  });

  test('reads a type it does not know as Unknown', () => {
    expect(toFieldKind(9999)).toBe(FieldKind.Unknown);
  });

  test('reads a column with no type at all as Unknown', () => {
    expect(toFieldKind(undefined)).toBe(FieldKind.Unknown);
  });
});
