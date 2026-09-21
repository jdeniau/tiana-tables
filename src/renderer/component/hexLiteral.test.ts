import { describe, expect, test } from 'vitest';
import toHexLiteral from './hexLiteral';

describe('toHexLiteral', () => {
  test('writes the bytes as the literal a server would accept', () => {
    // `SELECT 0x626C6F62` answers the four characters of "blob"
    expect(toHexLiteral(new Uint8Array([0x62, 0x6c, 0x6f, 0x62]), 16)).toBe(
      '0x626C6F62'
    );
  });

  // a byte under 16 still takes two characters, or the literal shifts
  test('pads a byte that would otherwise write as one digit', () => {
    expect(toHexLiteral(new Uint8Array([0, 1, 255]), 16)).toBe('0x0001FF');
  });

  test('says so when the budget left bytes out', () => {
    expect(toHexLiteral(new Uint8Array([1, 2, 3]), 2)).toBe('0x0102…');
  });

  // the budget is a bound, not a length: a shorter value ends where it ends
  test('says nothing when every byte fits', () => {
    expect(toHexLiteral(new Uint8Array([1, 2]), 2)).toBe('0x0102');
  });

  // a `BLOB` holding the empty string, which is not NULL
  test('an empty value is a literal of no bytes', () => {
    expect(toHexLiteral(new Uint8Array([]), 16)).toBe('0x');
  });
});
