import { describe, expect, test } from 'vitest';
import { closeConnectionTarget } from './closeConnectionTarget';

describe('closeConnectionTarget', () => {
  test('stays put when the closed connection is not the current one', () => {
    expect(closeConnectionTarget(['a', 'b', 'c'], 'a', 'b')).toBe(null);
  });

  test('moves to the left neighbour', () => {
    expect(closeConnectionTarget(['a', 'b', 'c'], 'b', 'b')).toBe(
      '/connections/a'
    );
  });

  test('moves to the right neighbour when closing the first one', () => {
    expect(closeConnectionTarget(['a', 'b', 'c'], 'a', 'a')).toBe(
      '/connections/b'
    );
  });

  test('falls back to the connection list when closing the last one', () => {
    expect(closeConnectionTarget(['a'], 'a', 'a')).toBe('/connect');
  });

  test('stays put when nothing is open', () => {
    expect(closeConnectionTarget([], 'a', null)).toBe(null);
  });
});
