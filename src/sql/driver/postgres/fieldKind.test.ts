import pg from 'pg';
import { describe, expect, test } from 'vitest';
import { FieldKind } from '../../resultField';
import { testables, toFieldKind } from './fieldKind';

const { KIND_BY_TYPE } = testables;

describe('KIND_BY_TYPE', () => {
  // the compiler checks the names `@types/pg` declares, this the ones `pg` ships
  test('covers every built-in type pg names', () => {
    expect(Object.keys(KIND_BY_TYPE).sort()).toEqual(
      Object.keys(pg.types.builtins).sort()
    );
  });
});

describe('toFieldKind', () => {
  test.each([
    ['INT4', FieldKind.Number],
    ['NUMERIC', FieldKind.Number],
    ['BOOL', FieldKind.Boolean],
    ['DATE', FieldKind.Date],
    ['TIMESTAMPTZ', FieldKind.DateTime],
    ['TIME', FieldKind.Time],
    ['VARCHAR', FieldKind.String],
    ['TEXT', FieldKind.Text],
    ['JSONB', FieldKind.Json],
    ['BYTEA', FieldKind.Binary],
  ] as const)('reads %s as %s', (name, kind) => {
    expect(toFieldKind(pg.types.builtins[name])).toBe(kind);
  });

  // measured: `text[]` and an enum `mood` are announced with OIDs of their own
  test('reads a type that is not built in as Unknown', () => {
    expect(toFieldKind(1009)).toBe(FieldKind.Unknown);
    expect(toFieldKind(16393)).toBe(FieldKind.Unknown);
  });
});
