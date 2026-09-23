import { describe, expect, test } from 'vitest';
import { toPositional } from './namedPlaceholders';

describe('toPositional', () => {
  test('numbers the placeholders in the order they appear', () => {
    expect(
      toPositional('SELECT * FROM t WHERE a = :first AND b = :second', {
        second: 2,
        first: 1,
      })
    ).toEqual({
      text: 'SELECT * FROM t WHERE a = $1 AND b = $2',
      values: [1, 2],
    });
  });

  test('binds a name used twice to one number', () => {
    expect(toPositional('SELECT :a, :b, :a', { a: 'x', b: 'y' })).toEqual({
      text: 'SELECT $1, $2, $1',
      values: ['x', 'y'],
    });
  });

  test('keeps a null value in its place', () => {
    expect(toPositional('SELECT :a, :b', { a: null, b: 1 })).toEqual({
      text: 'SELECT $1, $2',
      values: [null, 1],
    });
  });

  // a missing value would otherwise bind NULL, and a guarded write match nothing
  test('refuses a name the values lack', () => {
    expect(() => toPositional('SELECT :missing', {})).toThrow(':missing');
  });

  test('leaves a cast alone', () => {
    expect(
      toPositional('SELECT :value::text, x::jsonb', { value: 'v' })
    ).toEqual({ text: 'SELECT $1::text, x::jsonb', values: ['v'] });
  });

  // what the dialect writes around a placeholder: its literals, and the names it escapes
  describe('copies a quoted run as it is', () => {
    test.each([
      ['a literal', "SELECT ':no' || :yes", "SELECT ':no' || $1"],
      ['a doubled quote', "SELECT 'it''s :no', :yes", "SELECT 'it''s :no', $1"],
      [
        'an escaped identifier',
        'UPDATE "odd:no" SET "a""b:no" = :yes',
        'UPDATE "odd:no" SET "a""b:no" = $1',
      ],
    ])('%s', (_label, sql, text) => {
      expect(toPositional(sql, { yes: 1 })).toEqual({ text, values: [1] });
    });
  });
});
