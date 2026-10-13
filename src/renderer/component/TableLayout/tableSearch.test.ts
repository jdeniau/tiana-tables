import { describe, expect, test } from 'vitest';
import { readOrderParams, tableSearch } from './tableSearch';

describe('tableSearch', () => {
  test('writes the filter, then each sorted column in its order', () => {
    expect(
      tableSearch('parent_id IS NULL', [
        { id: 'name', desc: false },
        { id: 'id', desc: true },
      ])
    ).toBe('?where=parent_id%20IS%20NULL&order[name]=ASC&order[id]=DESC');
  });

  test('writes no sorted column as an empty `order`', () => {
    expect(tableSearch('', [])).toBe('?where=&order=');
  });
});

describe('readOrderParams', () => {
  test('reads the sorted columns in the order of the params', () => {
    expect(
      readOrderParams(
        new URLSearchParams('where=a&order[b]=DESC&order[a]=ASC')
      )
    ).toEqual([
      { id: 'b', desc: true },
      { id: 'a', desc: false },
    ]);
  });

  test('reads back a column name holding what a URL or the brackets use', () => {
    const name = 'a]b&c=d [e]%';

    expect(
      readOrderParams(
        new URLSearchParams(tableSearch('', [{ id: name, desc: true }]))
      )
    ).toEqual([{ id: name, desc: true }]);
  });

  test('an empty `order` is no sorted column', () => {
    expect(readOrderParams(new URLSearchParams('where=&order='))).toEqual([]);
  });

  test('gives nothing for a URL without an order, nor for a direction it does not know', () => {
    expect(readOrderParams(new URLSearchParams('where=a'))).toBeNull();
    expect(readOrderParams(new URLSearchParams('order[a]=asc'))).toBeNull();
  });
});
