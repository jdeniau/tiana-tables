import { describe, expect, it } from 'vitest';
import { escapeIdentifier, escapeLiteral } from './escape';

describe('escapeIdentifier', () => {
  it('wraps an identifier in double quotes, doubling the ones it holds', () => {
    expect(escapeIdentifier('we"ird')).toBe('"we""ird"');
  });

  it('refuses an empty identifier', () => {
    expect(() => escapeIdentifier('')).toThrow();
  });
});

describe('escapeLiteral', () => {
  it('wraps a text in single quotes, doubling the ones it holds', () => {
    expect(escapeLiteral("O'Brien")).toBe("'O''Brien'");
  });

  // SQLite reads `\` as itself: doubled, it would be stored twice
  it('leaves a backslash as it is', () => {
    expect(escapeLiteral('C:\\temp')).toBe("'C:\\temp'");
  });
});
