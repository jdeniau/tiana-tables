import { describe, expect, test } from 'vitest';
import { rowIdOf } from './rowId';

describe('rowIdOf', () => {
  test('a row with a key is named by its key', () => {
    expect(rowIdOf({ id: 12, name: 'a' }, 3, ['id'])).toBe('12');
  });

  test('a composite key joins its values', () => {
    expect(rowIdOf({ a: 1, b: 'x' }, 3, ['a', 'b'])).toBe('1-x');
  });

  test('a row with no key is named by its position', () => {
    expect(rowIdOf({ id: 12 }, 3, undefined)).toBe('3');
    expect(rowIdOf({ id: 12 }, 3, [])).toBe('3');
  });
});
