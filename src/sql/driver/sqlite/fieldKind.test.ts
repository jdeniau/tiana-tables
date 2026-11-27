import { describe, expect, it } from 'vitest';
import { FieldKind } from '../../resultField';
import { toFieldKind } from './fieldKind';

describe('toFieldKind', () => {
  it.each([
    ['DATE', FieldKind.Date],
    ['datetime', FieldKind.DateTime],
    ['DATETIME(6)', FieldKind.DateTime],
    ['TIMESTAMP WITH TIME ZONE', FieldKind.DateTime],
    ['TIME', FieldKind.Time],
    ['JSON', FieldKind.Json],
  ])('reads %s by its name', (declaredType, kind) => {
    expect(toFieldKind(declaredType)).toBe(kind);
  });

  it.each([
    ['INTEGER', FieldKind.Number],
    ['UNSIGNED BIG INT', FieldKind.Number],
    // SQLite's own reading: it holds `INT`
    ['POINT', FieldKind.Number],
    ['varchar(255)', FieldKind.String],
    ['NATIVE CHARACTER(70)', FieldKind.String],
    ['TEXT', FieldKind.Text],
    ['CLOB', FieldKind.Text],
    ['BLOB', FieldKind.Binary],
    ['REAL', FieldKind.Number],
    ['DECIMAL(10,2)', FieldKind.Number],
    ['BOOLEAN', FieldKind.Number],
    ['DATETIMEOFFSET', FieldKind.Number],
  ])('reads %s by its affinity', (declaredType, kind) => {
    expect(toFieldKind(declaredType)).toBe(kind);
  });

  it('takes the affinity named first by the rules, when a type holds two', () => {
    expect(toFieldKind('CHAR INT')).toBe(FieldKind.Number);
    expect(toFieldKind('TEXT BLOB')).toBe(FieldKind.Text);
  });

  it('knows nothing of an expression, or of a column declared with no type', () => {
    expect(toFieldKind(null)).toBe(FieldKind.Unknown);
    expect(toFieldKind('')).toBe(FieldKind.Unknown);
  });
});
