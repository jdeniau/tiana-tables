import { describe, expect, test } from 'vitest';
import { MAX_FILTER_HISTORY, pushFilter } from './filterHistory';

describe('pushFilter', () => {
  test('starts the history of a table that has none', () => {
    expect(pushFilter(undefined, 'id = 1')).toEqual(['id = 1']);
  });

  test('puts the last filter first', () => {
    expect(pushFilter(['id = 1'], 'id = 2')).toEqual(['id = 2', 'id = 1']);
  });

  test('moves a filter already used back to the head', () => {
    expect(pushFilter(['id = 3', 'id = 2', 'id = 1'], 'id = 1')).toEqual([
      'id = 1',
      'id = 3',
      'id = 2',
    ]);
  });

  test('keeps a multiline filter as it was typed', () => {
    const filter = 'id = 1\n  AND name = "a"';

    expect(pushFilter([], filter)).toEqual([filter]);
  });

  test('the blank the editor leaves at either end is not a difference', () => {
    expect(pushFilter(['id = 1'], 'id = 1\n')).toEqual(['id = 1\n']);
  });

  test('an empty filter is not one: the history is left alone', () => {
    expect(pushFilter(['id = 1'], '')).toEqual(['id = 1']);
    expect(pushFilter(['id = 1'], '  \n ')).toEqual(['id = 1']);
  });

  test('drops the oldest filter beyond the cap', () => {
    const full = Array.from(
      { length: MAX_FILTER_HISTORY },
      (_, index) => `id = ${index}`
    );

    const history = pushFilter(full, 'id = last');

    expect(history).toHaveLength(MAX_FILTER_HISTORY);
    expect(history[0]).toBe('id = last');
    expect(history).not.toContain(`id = ${MAX_FILTER_HISTORY - 1}`);
  });
});
