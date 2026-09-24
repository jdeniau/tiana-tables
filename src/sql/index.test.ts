import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ConnectionFailure } from './connectionError';
import { DatabaseEngine } from './engine';
import { UpdateCellStatus } from './updateCell';
import connectionStack from './index';

const mocks = vi.hoisted(() => ({
  connections: {} as Record<string, unknown>,
  createConnection: vi.fn(),
  pgClient: vi.fn(),
}));

vi.mock('electron-log', () => ({
  default: { debug: vi.fn(), error: vi.fn() },
}));

vi.mock('../configuration', () => ({
  getConfiguration: () => ({ connections: mocks.connections }),
}));

// the configuration holds the ciphertext: `safeStorage` is the real thing here, and there is no keyring behind it
vi.mock('../configuration/encryption', () => ({
  decryptPassword: (stored: string) =>
    Promise.resolve(
      stored === 'locked-away'
        ? { status: 'locked' }
        : stored === 'unreadable'
          ? { status: 'unreadable' }
          : { status: 'ok', password: stored.replace(/^encrypted-/, '') }
    ),
}));

vi.mock('mysql2/promise', () => ({
  createConnection: mocks.createConnection,
}));

// the real module but its client: the driver reads `types` and `DatabaseError` off it
vi.mock('pg', async (importOriginal) => {
  const { default: pg } = await importOriginal<typeof import('pg')>();

  return { default: { ...pg, Client: mocks.pgClient } };
});

/**
 * Every database-scoped query names its database. Nothing here announces a
 * "current database" first: that is the point — the announcement and the query
 * come from loaders that run in parallel, so a handler that read the announced
 * name would query whatever the last event happened to leave behind.
 */
describe('database-scoped queries', () => {
  let query: ReturnType<typeof vi.fn>;

  /** what the dialect's questions put on the socket */
  function statementsSent(): string[] {
    return query.mock.calls.map(([statement]) => statement.sql);
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.createConnection.mockReset();

    mocks.connections = {
      'my-connection': {
        slug: 'my-connection',
        engine: DatabaseEngine.MySQL,
        host: 'db.example.org',
        port: 3306,
        user: 'root',
        password: 'encrypted-secret',
      },
    };
    connectionStack.onConnectionSlugChanged('my-connection', undefined);

    query = vi.fn().mockResolvedValue([[], []]);
    mocks.createConnection.mockResolvedValue({
      on: vi.fn(),
      end: vi.fn().mockResolvedValue(undefined),
      query,
    });
  });

  afterEach(async () => {
    await connectionStack.closeAllConnections();
  });

  /**
   * The routing, which is all this layer owns:
   * what each statement says is tested with its dialect.
   */
  test.each([
    [
      'the databases',
      () => connectionStack.listDatabases(),
      'INFORMATION_SCHEMA.SCHEMATA',
    ],
    [
      'the tables',
      () => connectionStack.listTables('some-database'),
      'INFORMATION_SCHEMA.TABLES',
    ],
    [
      'the columns',
      () => connectionStack.getAllColumns('some-database'),
      'INFORMATION_SCHEMA.COLUMNS',
    ],
    [
      'the foreign keys',
      () => connectionStack.getForeignKeys('some-database'),
      'INFORMATION_SCHEMA.KEY_COLUMN_USAGE',
    ],
    [
      'the primary key',
      () => connectionStack.getPrimaryKeyColumns('some-database', 'some-table'),
      'INFORMATION_SCHEMA.STATISTICS',
    ],
    [
      'the structure of a table',
      () => connectionStack.getTableStructure('some-database', 'some-table'),
      'INFORMATION_SCHEMA.COLUMNS',
    ],
  ])(
    '%s is asked of the dialect of the connection',
    async (_label, ask, marker) => {
      await ask();

      expect(statementsSent().join('\n')).toContain(marker);
    }
  );

  // otherwise a summary object would reach a reader expecting rows, as one nonsense row
  test('a question answered with a write summary is refused', async () => {
    query.mockResolvedValue([{ affectedRows: 1, insertId: null }, []]);

    const { result, error } = await connectionStack.listTables('some-database');

    expect(result).toBeUndefined();
    expect(error?.message).toContain('read query');
  });

  // two questions, one page: the dialect's description, then the database's foreign keys
  test('the structure of a table joins its columns to their references', async () => {
    query.mockImplementation(({ sql }: { sql: string }) =>
      Promise.resolve([
        sql.includes('KEY_COLUMN_USAGE')
          ? [
              {
                TABLE_NAME: 'some-table',
                COLUMN_NAME: 'auteur_id',
                REFERENCED_TABLE_NAME: 'auteur',
                REFERENCED_COLUMN_NAME: 'id',
              },
            ]
          : [
              {
                COLUMN_NAME: 'auteur_id',
                COLUMN_TYPE: 'int(11)',
                IS_NULLABLE: 'NO',
                COLUMN_KEY: 'MUL',
                COLUMN_DEFAULT: null,
                EXTRA: '',
                COLLATION_NAME: null,
                COLUMN_COMMENT: '',
              },
            ],
        [],
      ])
    );

    const { result } = await connectionStack.getTableStructure(
      'some-database',
      'some-table'
    );

    expect(result?.[0]).toEqual([
      expect.objectContaining({ Column: 'auteur_id', References: 'auteur.id' }),
    ]);
    expect(result?.[1].map((field) => field.name)).toContain('References');
  });

  // a server's collation would answer `user, users, user_role`
  test.each([
    ['tables', () => connectionStack.listTables('some-database'), 'TABLE_NAME'],
    ['databases', () => connectionStack.listDatabases(), 'SCHEMA_NAME'],
  ])('the %s are listed as `SHOW` listed them', async (_label, ask, column) => {
    query.mockResolvedValue([
      ['users', 'user_role', 'alpha', 'Zeta', 'user'].map((name) => ({
        [column]: name,
      })),
      [],
    ]);

    const { result } = await ask();

    expect(result).toEqual(['Zeta', 'alpha', 'user', 'user_role', 'users']);
  });

  describe('writing a cell', () => {
    const request = {
      database: 'shop',
      table: 'orders',
      column: 'label',
      primaryKey: [{ column: 'id', value: 42 }],
      newValue: 'new label',
      originalValue: 'old label',
    };

    test('writes, then reads the cell back for the outcome', async () => {
      query
        .mockResolvedValueOnce([{ affectedRows: 1, insertId: 0 }, []])
        .mockResolvedValueOnce([[{ value: 'new label', guardMatches: 0 }], []]);

      const { result } = await connectionStack.updateCell(request);

      expect(statementsSent()).toEqual([
        expect.stringMatching(/^UPDATE /),
        expect.stringMatching(/^SELECT /),
      ]);
      expect(result).toEqual({
        status: UpdateCellStatus.Updated,
        value: 'new label',
      });
    });

    test('a write the server refused is encoded, and nothing is read back', async () => {
      query.mockRejectedValueOnce(new Error('ER_DATA_TOO_LONG'));

      const { result, error } = await connectionStack.updateCell(request);

      expect(result).toBeUndefined();
      expect(error).toMatchObject({ message: 'ER_DATA_TOO_LONG' });
      expect(query).toHaveBeenCalledTimes(1);
    });
  });

  // tagged by the driver, so the result tab can tell it from a crash
  test('a statement the server refused crosses IPC as one', async () => {
    query.mockRejectedValue(
      Object.assign(new Error("Table 'shop.nope' doesn't exist"), {
        code: 'ER_NO_SUCH_TABLE',
        errno: 1146,
        sqlState: '42S02',
      })
    );

    const { error } = await connectionStack.listTables('some-database');

    // a plain object: an Error loses everything but its message over IPC
    expect(error).not.toBeInstanceOf(Error);
    expect(error).toMatchObject({
      message: "Table 'shop.nope' doesn't exist",
      detail: { kind: 'sql', code: 'ER_NO_SUCH_TABLE', errno: 1146 },
    });
  });

  test('an error of the server is encoded, never thrown at the renderer', async () => {
    query.mockRejectedValue(new Error('ER_NO_SUCH_TABLE'));

    const { result, error } = await connectionStack.listTables('some-database');

    expect(result).toBeUndefined();
    expect(error).toMatchObject({ message: 'ER_NO_SUCH_TABLE' });
  });

  // a name we failed to pass is our bug, not a server's answer,
  // so it is thrown rather than encoded
  test.each([
    ['a database', () => connectionStack.listTables(''), 'Database name'],
    [
      'a table',
      () => connectionStack.getTableStructure('some-database', ''),
      'Table name',
    ],
  ])(
    '%s left unnamed is refused rather than queried',
    async (_label, ask, message) => {
      await expect(ask()).rejects.toThrow(`${message} is required`);

      expect(query).not.toHaveBeenCalled();
    }
  );
});

/**
 * Opening a connection is the one operation the user waits on with nothing to
 * look at, so it is bounded, attempted once, and answered — never thrown past
 * the `{ result, error }` envelope the renderer decodes.
 */
/** The same routing on a PostgreSQL connection, with markers the MySQL dialect cannot hold. */
describe('database-scoped queries on PostgreSQL', () => {
  let query: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mocks.pgClient.mockReset();

    mocks.connections = {
      'my-postgres': {
        slug: 'my-postgres',
        engine: DatabaseEngine.PostgreSQL,
        host: 'db.example.org',
        port: 5432,
        user: 'postgres',
        password: 'encrypted-secret',
        database: 'shop',
      },
    };
    connectionStack.onConnectionSlugChanged('my-postgres', undefined);

    // a column and no row: what a question finding nothing answers
    query = vi.fn().mockResolvedValue({
      fields: [{ name: 'relname', dataTypeID: 19 }],
      rows: [],
      rowCount: 0,
    });
    mocks.pgClient.mockImplementation(function () {
      return {
        connect: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        end: vi.fn().mockResolvedValue(undefined),
        query,
      };
    });
  });

  afterEach(async () => {
    await connectionStack.closeAllConnections();
  });

  test('the connection opens the database it names', async () => {
    await connectionStack.listDatabases();

    expect(mocks.pgClient).toHaveBeenCalledWith(
      expect.objectContaining({ database: 'shop', password: 'secret' })
    );
  });

  test.each([
    [
      'the schemas',
      () => connectionStack.listDatabases(),
      'pg_catalog.pg_namespace',
    ],
    [
      'the tables',
      () => connectionStack.listTables('app'),
      'pg_catalog.pg_class',
    ],
    [
      'the columns',
      () => connectionStack.getAllColumns('app'),
      'pg_catalog.pg_attribute',
    ],
    [
      'the foreign keys',
      () => connectionStack.getForeignKeys('app'),
      'con.confkey',
    ],
    [
      'the primary key',
      () => connectionStack.getPrimaryKeyColumns('app', 'orders'),
      "con.contype = 'p'",
    ],
    [
      'the structure of a table',
      () => connectionStack.getTableStructure('app', 'orders'),
      'pg_catalog.pg_attrdef',
    ],
  ])('%s is asked of the PostgreSQL dialect', async (_label, ask, marker) => {
    const { error } = await ask();

    expect(error).toBeUndefined();
    expect(
      query.mock.calls.map(([statement]) => statement.text).join('\n')
    ).toContain(marker);
  });

  // the placeholders are numbered on the way to `pg`, which knows no `:name`
  test('a question binds its values by number', async () => {
    await connectionStack.listTables('app');

    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('n.nspname = $1'),
        values: ['app'],
      })
    );
  });
});

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
        engine: DatabaseEngine.MySQL,
        host: 'db.example.org',
        port: 3306,
        user: 'root',
        password: 'encrypted-secret',
        appState: { activeDatabase: 'some-database' },
      },
    };

    await connectionStack.closeAllConnections();
    connectionStack.onConnectionSlugChanged('my-connection', undefined);
  });

  test('the handshake is given a deadline of our own', async () => {
    mocks.createConnection.mockResolvedValue(fakeConnection());

    await connectionStack.listDatabases();

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

  test('the stored password is decrypted on its way to the driver', async () => {
    mocks.createConnection.mockResolvedValue(fakeConnection());

    await connectionStack.listDatabases();

    expect(mocks.createConnection).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'secret' })
    );
  });

  test.each([
    ['locked-away', ConnectionFailure.keyringLocked],
    ['unreadable', ConnectionFailure.passwordUnreadable],
  ])(
    'a password stored as %s fails the connection, and names why',
    async (stored, reason) => {
      mocks.createConnection.mockResolvedValue(fakeConnection());
      mocks.connections['my-connection'] = {
        ...(mocks.connections['my-connection'] as object),
        password: stored,
      };

      const { result, error } = await connectionStack.listDatabases();

      expect(result).toBeUndefined();
      expect(error).toMatchObject({ detail: { kind: 'connection', reason } });
      // the driver is never even called with a password we could not read
      expect(mocks.createConnection).not.toHaveBeenCalled();
    }
  );

  test('queries racing for the same connection share one handshake', async () => {
    mocks.createConnection.mockResolvedValue(fakeConnection());

    // what React Router does with the loaders of a `/connections/x/db/tables/t`
    await Promise.all([
      connectionStack.listDatabases(),
      connectionStack.listTables('some-database'),
    ]);

    expect(mocks.createConnection).toHaveBeenCalledTimes(1);
  });

  test('a handshake that fails is answered, not thrown', async () => {
    mocks.createConnection.mockRejectedValue(timeout());

    const { result, error } = await connectionStack.listDatabases();

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
      connectionStack.listDatabases(),
      connectionStack.listTables('some-database'),
    ]);

    expect(mocks.createConnection).toHaveBeenCalledTimes(1);
    expect(first.error).toBeDefined();
    expect(second.error).toBeDefined();
  });

  test('a query on a socket the server dropped is retried on a fresh one', async () => {
    const dropped = fakeConnection();

    // what mysql2 answers on a connection the server closed under us, and it
    // says it in the message alone — no code, no class
    dropped.query.mockRejectedValue(
      new Error("Can't add new command when connection is in closed state")
    );

    mocks.createConnection
      .mockResolvedValueOnce(dropped)
      .mockResolvedValueOnce(fakeConnection());

    const { error } = await connectionStack.listDatabases();

    expect(error).toBeUndefined();
    expect(mocks.createConnection).toHaveBeenCalledTimes(2);
  });

  test('a socket that is gone twice is retried once, then answered', async () => {
    const dropped = () => {
      const connection = fakeConnection();

      connection.query.mockRejectedValue(
        new Error("Can't add new command when connection is in closed state")
      );

      return connection;
    };

    mocks.createConnection.mockResolvedValue(dropped());

    const { error } = await connectionStack.listDatabases();

    expect(error).toBeDefined();
    // two handshakes and no more: a retry that loses its socket too is an
    // answer, not a reason to keep opening connections
    expect(mocks.createConnection).toHaveBeenCalledTimes(2);
  });

  test('a query that the server refused is answered, never retried', async () => {
    const connection = fakeConnection();

    connection.query.mockRejectedValue(
      Object.assign(new Error("Table 'shop.nope' doesn't exist"), {
        code: 'ER_NO_SUCH_TABLE',
      })
    );

    mocks.createConnection.mockResolvedValue(connection);

    const { error } = await connectionStack.listDatabases();

    expect(error).toBeDefined();
    // one handshake, one query: a statement the server understood and refused
    // is not something a second connection would answer differently
    expect(mocks.createConnection).toHaveBeenCalledTimes(1);
    expect(connection.query).toHaveBeenCalledTimes(1);
  });

  test('a failed attempt is forgotten, so a later query tries again', async () => {
    mocks.createConnection
      .mockRejectedValueOnce(timeout())
      .mockResolvedValueOnce(fakeConnection());

    const failed = await connectionStack.listDatabases();
    const retried = await connectionStack.listDatabases();

    expect(failed.error).toBeDefined();
    expect(retried.error).toBeUndefined();
    expect(mocks.createConnection).toHaveBeenCalledTimes(2);
  });
});
