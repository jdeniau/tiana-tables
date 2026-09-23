import { describe, expect, it } from 'vitest';
import { escapeIdentifier, escapeLiteral } from './escape';

describe('escapeIdentifier', () => {
  it('wraps an identifier in double quotes', () => {
    expect(escapeIdentifier('users')).toBe('"users"');
  });

  // unquoted, PostgreSQL would fold it to `users`
  it('keeps the case of a name', () => {
    expect(escapeIdentifier('Users')).toBe('"Users"');
  });
});

describe('escapeLiteral', () => {
  it('wraps a text in single quotes, doubling the ones it holds', () => {
    expect(escapeLiteral("O'Brien")).toBe("'O''Brien'");
  });

  // read the same whether `standard_conforming_strings` is on or off
  it('writes a backslash in an escape literal, doubled', () => {
    expect(escapeLiteral('C:\\temp')).toBe("E'C:\\\\temp'");
  });

  it('leaves a text without a backslash a plain literal', () => {
    expect(escapeLiteral('a"b')).toBe("'a\"b'");
  });
});
