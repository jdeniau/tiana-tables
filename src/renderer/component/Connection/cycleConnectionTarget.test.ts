import { describe, expect, test } from 'vitest';
import { cycleConnectionTarget } from './cycleConnectionTarget';

describe('cycleConnectionTarget', () => {
  test('moves right, back to the first after the last', () => {
    const visited = [];
    let current = 'a';

    for (let i = 0; i < 4; i++) {
      const target = cycleConnectionTarget(['a', 'b', 'c'], current, 1);
      visited.push(target);
      current = target?.replace('/connections/', '') ?? current;
    }

    expect(visited).toEqual([
      '/connections/b',
      '/connections/c',
      '/connections/a',
      '/connections/b',
    ]);
  });

  test('moves left, to the last from the first', () => {
    expect(cycleConnectionTarget(['a', 'b', 'c'], 'b', -1)).toBe(
      '/connections/a'
    );
    expect(cycleConnectionTarget(['a', 'b', 'c'], 'a', -1)).toBe(
      '/connections/c'
    );
  });

  test('stays put with a single connection', () => {
    expect(cycleConnectionTarget(['a'], 'a', 1)).toBe(null);
    expect(cycleConnectionTarget(['a'], 'a', -1)).toBe(null);
  });

  test('stays put away from a connection', () => {
    expect(cycleConnectionTarget(['a', 'b'], null, 1)).toBe(null);
    expect(cycleConnectionTarget(['a', 'b'], 'closed', 1)).toBe(null);
  });
});
