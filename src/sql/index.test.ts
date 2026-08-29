import { beforeEach, describe, expect, test, vi } from 'vitest';
import connectionStack from './index';

vi.mock('electron-log', () => ({
  default: { debug: vi.fn(), error: vi.fn() },
}));

vi.mock('../configuration', () => ({
  getConfiguration: () => ({ connections: {} }),
}));

/**
 * Every database-scoped query names its database. Nothing here announces a
 * "current database" first: that is the point — the announcement and the query
 * come from loaders that run in parallel, so a handler that read the announced
 * name would query whatever the last event happened to leave behind.
 */
describe('database-scoped queries', () => {
  let executeQuery: ReturnType<typeof vi.spyOn>;

  function lastQuery(): { query: unknown; values: unknown } {
    const [query, , values] = executeQuery.mock.lastCall ?? [];

    return { query, values };
  }

  beforeEach(() => {
    vi.restoreAllMocks();

    executeQuery = vi
      .spyOn(connectionStack, 'executeQueryAndRetry')
      // the result is not what is under test here
      .mockResolvedValue({ result: [[], []], error: undefined } as never);
  });

  test('SHOW TABLE STATUS names the given database', async () => {
    await connectionStack.showTableStatus('some-database');

    expect(lastQuery().query).toContain(
      'SHOW TABLE STATUS FROM `some-database`'
    );
  });

  test('SHOW KEYS names the given database and table', async () => {
    await connectionStack.getPrimaryKeys('some-database', 'some-table');

    expect(lastQuery().query).toContain(
      'SHOW KEYS FROM `some-database`.`some-table`'
    );
  });

  test('the columns of a database are read with a bound schema name', async () => {
    await connectionStack.getAllColumns('some-database');

    const { query, values } = lastQuery();

    expect(query).toContain('TABLE_SCHEMA = :databaseName');
    expect(values).toEqual({ databaseName: 'some-database' });
  });

  test('the key column usage of a table is read with bound names', async () => {
    await connectionStack.getKeyColumnUsage('some-database', 'some-table');

    const { query, values } = lastQuery();

    expect(query).toContain('TABLE_SCHEMA = :databaseName');
    expect(query).toContain('AND TABLE_NAME = :tableName');
    expect(values).toEqual({
      databaseName: 'some-database',
      tableName: 'some-table',
    });
  });

  test('the key column usage of a whole database binds the schema alone', async () => {
    await connectionStack.getKeyColumnUsage('some-database');

    const { query, values } = lastQuery();

    expect(query).not.toContain(':tableName');
    // no `:tableName` in the query, so no `tableName` to bind: a parameter the
    // statement does not name would be ignored in silence
    expect(values).toEqual({ databaseName: 'some-database' });
  });

  test('a missing database name is refused rather than queried', async () => {
    await expect(connectionStack.showTableStatus('')).rejects.toThrowError(
      'Database name is required'
    );

    expect(executeQuery).not.toHaveBeenCalled();
  });
});
