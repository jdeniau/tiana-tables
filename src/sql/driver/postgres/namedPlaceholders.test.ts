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

  describe('copies what is not code as it is', () => {
    test.each([
      ['a literal', "SELECT ':no' || :yes", "SELECT ':no' || $1"],
      ['a doubled quote', "SELECT 'it''s :no', :yes", "SELECT 'it''s :no', $1"],
      [
        'a backslash in an escape literal',
        "SELECT E'\\' :no', :yes",
        "SELECT E'\\' :no', $1",
      ],
      [
        'a doubled quote then a backslash in an escape literal',
        "SELECT E'it''s \\' :no', :yes",
        "SELECT E'it''s \\' :no', $1",
      ],
      [
        'a backslash in a plain literal, which escapes nothing',
        "SELECT 'a\\', :yes",
        "SELECT 'a\\', $1",
      ],
      [
        'a quoted identifier',
        'SELECT "odd:no" FROM t WHERE x = :yes',
        'SELECT "odd:no" FROM t WHERE x = $1',
      ],
      ['a line comment', 'SELECT 1 -- :no\n, :yes', 'SELECT 1 -- :no\n, $1'],
      [
        'a nested block comment',
        'SELECT /* a /* :no */ :no */ :yes',
        'SELECT /* a /* :no */ :no */ $1',
      ],
      [
        'a dollar-quoted body',
        'SELECT $$ :no $$, :yes',
        'SELECT $$ :no $$, $1',
      ],
      [
        'a tagged dollar-quoted body holding `$$`',
        'SELECT $fn$ $$ :no $$ $fn$, :yes',
        'SELECT $fn$ $$ :no $$ $fn$, $1',
      ],
    ])('%s', (_label, sql, text) => {
      expect(toPositional(sql, { yes: 1 })).toEqual({ text, values: [1] });
    });
  });

  // `a$b` is a legal identifier: its `$` opens no dollar quote
  test('reads a `$` inside an identifier as part of it', () => {
    expect(
      toPositional('SELECT a$b$ FROM t WHERE x = :yes', { yes: 1 })
    ).toEqual({ text: 'SELECT a$b$ FROM t WHERE x = $1', values: [1] });
  });

  // `LIKE'…'` ends in an E that prefixes nothing
  test('does not take the E ending a word for an escape prefix', () => {
    expect(
      toPositional("SELECT 1 WHERE x LIKE'a\\' AND y = :yes", { yes: 1 })
    ).toEqual({
      text: "SELECT 1 WHERE x LIKE'a\\' AND y = $1",
      values: [1],
    });
  });

  test('leaves a statement without placeholders untouched', () => {
    const sql = 'SELECT \'a\' AS "b" FROM c WHERE d::int = 1';

    expect(toPositional(sql, {})).toEqual({ text: sql, values: [] });
  });
});
