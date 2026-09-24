import { describe, expect, test, vi } from 'vitest';
import { relationNames } from './relationNames';

describe('relationNames', () => {
  test('names each relation from the catalog', async () => {
    const tablesOf = relationNames(async () => [
      { oid: 1, relname: 'orders' },
      { oid: 2, relname: 'users' },
    ]);

    expect(await tablesOf([1, 2])).toEqual(
      new Map([
        [1, 'orders'],
        [2, 'users'],
      ])
    );
  });

  test('asks the catalog once per relation, and nothing for a computed column', async () => {
    const lookup = vi.fn(async (oids: number[]) =>
      oids.map((oid) => ({ oid, relname: `t${oid}` }))
    );
    const tablesOf = relationNames(lookup);

    await tablesOf([1, 1, 0]);
    await tablesOf([1, 2]);

    expect(lookup.mock.calls).toEqual([[[1]], [[2]]]);
  });

  // a relation dropped since, or one the user may not see
  test('remembers an OID that names no relation, without asking again', async () => {
    const lookup = vi.fn(async () => []);
    const tablesOf = relationNames(lookup);

    expect((await tablesOf([7])).get(7)).toBeNull();

    await tablesOf([7]);

    expect(lookup).toHaveBeenCalledTimes(1);
  });

  test('costs the columns their table when the catalog fails, and asks again later', async () => {
    const lookup = vi
      .fn()
      .mockRejectedValueOnce(new Error('current transaction is aborted'))
      .mockResolvedValueOnce([{ oid: 1, relname: 'orders' }]);
    const tablesOf = relationNames(lookup);

    expect((await tablesOf([1])).get(1)).toBeUndefined();
    expect((await tablesOf([1])).get(1)).toBe('orders');
  });
});
