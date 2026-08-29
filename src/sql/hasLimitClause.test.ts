import { describe, expect, test } from 'vitest';
import { hasLimitClause } from './hasLimitClause';

describe('hasLimitClause', () => {
  test.each([
    ['SELECT * FROM t LIMIT 10', true],
    ['SELECT * FROM t limit 10', true],
    ['SELECT * FROM t LIMIT 10 OFFSET 5', true],
    ['SELECT * FROM t LIMIT 5, 10;', true],
    ['SELECT * FROM t', false],
    ['SELECT day, COUNT(*) FROM t GROUP BY day ORDER BY day', false],
  ])('%s -> %s', (sql, expected) => {
    expect(hasLimitClause(sql)).toBe(expected);
  });

  test('a string literal that reads "limit" is not a clause', () => {
    expect(hasLimitClause(`SELECT * FROM t WHERE name = 'limit'`)).toBe(false);
  });

  test('a column named limit is quoted, so it is not a clause either', () => {
    expect(hasLimitClause('SELECT `limit` FROM t')).toBe(false);
  });

  // Conservative on purpose: the outer result set may well be complete, but the
  // tokens alone cannot tell us that.
  test('a LIMIT in a subquery counts', () => {
    expect(hasLimitClause('SELECT * FROM (SELECT * FROM t LIMIT 3) x')).toBe(
      true
    );
  });

  // Lexing never fails, unlike parsing — this is the whole point of the
  // implementation, so it deserves a test.
  test('answers on a query that does not parse', () => {
    expect(hasLimitClause('SELECT FROM WHERE LIMIT')).toBe(true);
    expect(hasLimitClause('SELECT FROM t1 a')).toBe(false);
  });

  test('answers on an empty query', () => {
    expect(hasLimitClause('')).toBe(false);
  });
});
