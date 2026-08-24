import { describe, expect, it } from 'vitest';
import { escapeIdentifier } from './escapeIdentifier';

describe('escapeIdentifier', () => {
  it('wraps an identifier in backticks', () => {
    expect(escapeIdentifier('orders')).toBe('`orders`');
  });

  it('doubles a backtick held by the identifier', () => {
    expect(escapeIdentifier('we`ird')).toBe('`we``ird`');
  });

  it('quotes a name that would not be valid bare', () => {
    // the whole point of the escaping: `SHOW TABLE STATUS FROM my-db` is a
    // syntax error, and `-` in a database or table name is common enough
    expect(escapeIdentifier('my-db')).toBe('`my-db`');
  });

  it('refuses an empty identifier', () => {
    expect(() => escapeIdentifier('')).toThrow();
  });
});
