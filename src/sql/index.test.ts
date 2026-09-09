import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ConnectionFailure } from './connectionError';
import connectionStack from './index';

const mocks = vi.hoisted(() => ({
  connections: {} as Record<string, unknown>,
  createConnection: vi.fn(),
}));

vi.mock('electron-log', () => ({
  default: { debug: vi.fn(), error: vi.fn() },
}));

vi.mock('../configuration', () => ({
  getConfiguration: () => ({ connections: mocks.connections }),
}));

vi.mock('mysql2/promise', () => ({
  createConnection: mocks.createConnection,
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

  test('the structure of a table is read with bound names, in column order', async () => {
    await connectionStack.getTableStructure('some-database', 'some-table');

    const { query, values } = lastQuery();

    expect(query).toContain('c.TABLE_SCHEMA = :databaseName');
    expect(query).toContain('AND c.TABLE_NAME = :tableName');
    // the page reads as the table is declared, not as INFORMATION_SCHEMA
    // happens to answer
    expect(query).toContain('ORDER BY');
    expect(query).toContain('c.ORDINAL_POSITION');
    expect(values).toEqual({
      databaseName: 'some-database',
      tableName: 'some-table',
    });
  });

  test('the structure of a table is one statement, subquery included', async () => {
    await connectionStack.getTableStructure('some-database', 'some-table');

    const { query } = lastQuery();

    // `multipleStatements` is off: a `;` anywhere but at the very end would
    // make the whole read fail
    expect(String(query).replace(/;\s*$/, '')).not.toContain(';');
  });

  test('a missing table name is refused rather than queried', async () => {
    await expect(
      connectionStack.getTableStructure('some-database', '')
    ).rejects.toThrow('Table name is required');

    expect(executeQuery).not.toHaveBeenCalled();
  });

  test('a missing database name is refused rather than queried', async () => {
    await expect(connectionStack.showTableStatus('')).rejects.toThrow(
      'Database name is required'
    );

    expect(executeQuery).not.toHaveBeenCalled();
  });
});

/**
 * Opening a connection is the one operation the user waits on with nothing to
 * look at, so it is bounded, attempted once, and answered — never thrown past
 * the `{ result, error }` envelope the renderer decodes.
 */
describe('opening a connection', () => {
  function fakeConnection() {
    return {
      on: vi.fn(),
      end: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue([[], []]),
    };
  }

  function timeout() {
    return Object.assign(new Error('connect ETIMEDOUT'), {
      code: 'ETIMEDOUT',
    });
  }

  beforeEach(async () => {
    // the suite above leaves `executeQueryAndRetry` spied by its last test
    vi.restoreAllMocks();
    mocks.createConnection.mockReset();

    mocks.connections = {
      'my-connection': {
        name: 'My connection',
        slug: 'my-connection',
        host: 'db.example.org',
        port: 3306,
        user: 'root',
        password: 'secret',
        appState: { activeDatabase: 'some-database' },
      },
    };

    await connectionStack.closeAllConnections();
    connectionStack.onConnectionSlugChanged('my-connection', undefined);
  });

  test('the handshake is given a deadline of our own', async () => {
    mocks.createConnection.mockResolvedValue(fakeConnection());

    await connectionStack.showDatabases();

    expect(mocks.createConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'db.example.org',
        port: 3306,
        connectTimeout: 10_000,
      })
    );
    // `appState` is configuration of ours, and no business of the driver's
    expect(mocks.createConnection).toHaveBeenCalledWith(
      expect.not.objectContaining({ appState: expect.anything() })
    );
  });

  test('queries racing for the same connection share one handshake', async () => {
    mocks.createConnection.mockResolvedValue(fakeConnection());

    // what React Router does with the loaders of a `/connections/x/db/tables/t`
    await Promise.all([
      connectionStack.showDatabases(),
      connectionStack.showTableStatus('some-database'),
    ]);

    expect(mocks.createConnection).toHaveBeenCalledTimes(1);
  });

  test('a handshake that fails is answered, not thrown', async () => {
    mocks.createConnection.mockRejectedValue(timeout());

    const { result, error } = await connectionStack.showDatabases();

    expect(result).toBeUndefined();
    expect(error).toMatchObject({
      detail: {
        kind: 'connection',
        reason: ConnectionFailure.timeout,
        host: 'db.example.org',
        // the deadline travels with the failure, so the message can name it
        timeoutMs: 10_000,
      },
    });
  });

  test('racing queries fail once, on one attempt', async () => {
    mocks.createConnection.mockRejectedValue(timeout());

    const [first, second] = await Promise.all([
      connectionStack.showDatabases(),
      connectionStack.showTableStatus('some-database'),
    ]);

    expect(mocks.createConnection).toHaveBeenCalledTimes(1);
    expect(first.error).toBeDefined();
    expect(second.error).toBeDefined();
  });

  test('a failed attempt is forgotten, so a later query tries again', async () => {
    mocks.createConnection
      .mockRejectedValueOnce(timeout())
      .mockResolvedValueOnce(fakeConnection());

    const failed = await connectionStack.showDatabases();
    const retried = await connectionStack.showDatabases();

    expect(failed.error).toBeDefined();
    expect(retried.error).toBeUndefined();
    expect(mocks.createConnection).toHaveBeenCalledTimes(2);
  });
});
