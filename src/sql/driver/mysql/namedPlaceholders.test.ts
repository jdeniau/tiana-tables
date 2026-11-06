import { describe, expect, test } from 'vitest';
import { toPositional } from './namedPlaceholders';

describe('toPositional', () => {
  test('lists the values in the order their placeholders appear', () => {
    expect(
      toPositional('SELECT * FROM t WHERE a = :first AND b = :second', {
        second: 2,
        first: 1,
      })
    ).toEqual({
      sql: 'SELECT * FROM t WHERE a = ? AND b = ?',
      values: [1, 2],
    });
  });

  test('binds a name used twice at each of its places', () => {
    expect(toPositional('SELECT :a, :b, :a', { a: 'x', b: 'y' })).toEqual({
      sql: 'SELECT ?, ?, ?',
      values: ['x', 'y', 'x'],
    });
  });

  test('keeps a null value in its place', () => {
    expect(toPositional('SELECT :a, :b', { a: null, b: 1 })).toEqual({
      sql: 'SELECT ?, ?',
      values: [null, 1],
    });
  });

  // a missing value would otherwise bind NULL, and a guarded write match nothing
  test('refuses a name the values lack', () => {
    expect(() => toPositional('SELECT :missing', {})).toThrow(':missing');
  });

  // what the dialect writes around a placeholder: its literals, and the names it escapes
  describe('copies a quoted run as it is', () => {
    test.each([
      ['a literal', "SELECT ':no', :yes", "SELECT ':no', ?"],
      ['a doubled quote', "SELECT 'it''s :no', :yes", "SELECT 'it''s :no', ?"],
      [
        'an identifier holding a placeholder',
        'UPDATE `t:no` SET `a?` = :yes',
        'UPDATE `t:no` SET `a?` = ?',
      ],
      [
        'an identifier holding a backtick',
        'UPDATE `a``b:no` SET `c` = :yes',
        'UPDATE `a``b:no` SET `c` = ?',
      ],
    ])('%s', (_label, sql, positional) => {
      expect(toPositional(sql, { yes: 1 })).toEqual({
        sql: positional,
        values: [1],
      });
    });
  });
});
